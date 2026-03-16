
import { SuiGrpcClient } from "@mysten/sui/grpc";
import {
    getWallets,
    SuiSignTransaction,
    type SuiSignTransactionFeature,
} from "@mysten/wallet-standard";
import { Transaction } from "@mysten/sui/transactions";
import {
    StandardConnect,
    type StandardConnectFeature,
} from "@wallet-standard/features";
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { Roles, RoleNames, AssignableRoles, type RoleId } from "./constants";

// -------------------- Types --------------------

export type Network = "testnet" | "devnet" | "mainnet" | "localnet";

type WalletList = ReturnType<ReturnType<typeof getWallets>["get"]>;
type Wallet = WalletList[number];

type CompatibleWallet = Wallet & {
    features: Wallet["features"] & {
        [StandardConnect]: StandardConnectFeature[typeof StandardConnect];
        [SuiSignTransaction]: SuiSignTransactionFeature[typeof SuiSignTransaction];
    };
};

// -------------------- Shared runtime state --------------------

let grpcClient: SuiGrpcClient | null = null;
let currentNetwork: Network | null = null;
let currentRpcUrl: string | null = null;
let preferredWalletName: string | null = null;
let currentApiBaseUrl: string | null = null;

// -------------------- Init / client access --------------------

export function init(network: Network, rpcUrl: string, preferredWallet: string, apiBaseUrl: string) {
    currentNetwork = network;
    currentRpcUrl = rpcUrl;
    preferredWalletName = preferredWallet;
    currentApiBaseUrl = apiBaseUrl;

    grpcClient = new SuiGrpcClient({
        network,
        baseUrl: rpcUrl,
    });
}

function requireInit(): { network: Network; rpcUrl: string } {
    if (!currentNetwork || !currentRpcUrl) {
        throw new Error("suiInterop.init(network, rpcUrl) must be called before using Sui interop.");
    }

    return {
        network: currentNetwork,
        rpcUrl: currentRpcUrl,
    };
}

function c(): SuiGrpcClient {
    if (!grpcClient) {
        const { network, rpcUrl } = requireInit();

        grpcClient = new SuiGrpcClient({
            network,
            baseUrl: rpcUrl,
        });
    }

    return grpcClient;
}

function makeJsonRpcClient(): SuiJsonRpcClient {
    const { network, rpcUrl } = requireInit();

    return new SuiJsonRpcClient({
        network,
        url: rpcUrl,
    });
}

function requireApiBaseUrl(): string {
    if (!currentApiBaseUrl) {
        throw new Error("walletInterop.init(network, rpcUrl, preferredWallet, apiBaseUrl) must be called before API calls.");
    }

    return currentApiBaseUrl.endsWith("/")
        ? currentApiBaseUrl
        : `${currentApiBaseUrl}/`;
}

// -------------------- Wallet helpers --------------------

//preferredWalletName comes from appsettings.json for localnet, testnet etc.
export function pickWallet(preferredName = preferredWalletName): Wallet {
    const wallets = getWallets().get();

    if (!wallets.length) {
        throw new Error("No Sui wallets found.");
    }

    const preferred = wallets.find(
        (w) =>
            w.name === preferredName &&
            !!w.features[StandardConnect] &&
            !!w.features[SuiSignTransaction],
    );
    if (preferred) return preferred;

    const compatible = wallets.find(
        (w) =>
            !!w.features[StandardConnect] &&
            !!w.features[SuiSignTransaction],
    );
    if (compatible) return compatible;

    const legacy = wallets.find(
        (w) =>
            !!w.features[StandardConnect] &&
            !!w.features["sui:signTransactionBlock"],
    );
    if (legacy) {
        throw new Error(
            `Wallet "${legacy.name}" only exposes deprecated legacy signing (sui:signTransactionBlock).`,
        );
    }

    const names = wallets.map((w) => w.name).join(", ");
    throw new Error(
        `No compatible wallet found. Detected: ${names}. Need standard:connect + sui:signTransaction.`,
    );
}

async function getConnectedAccounts(wallet: Wallet) {
    let accounts = wallet.accounts ?? [];

    if (!accounts.length) {
        const connectFeature =
            wallet.features[StandardConnect] as
            | StandardConnectFeature[typeof StandardConnect]
            | undefined;

        if (!connectFeature) {
            throw new Error("Wallet does not support standard:connect");
        }

        const result = await connectFeature.connect();
        accounts = result.accounts ?? [];
    }

    if (!accounts.length) {
        throw new Error("No accounts returned from wallet.");
    }

    return accounts;
}

export async function connectSui(): Promise<string> {
    const wallet = pickWallet();
    const accounts = await getConnectedAccounts(wallet);
    return accounts[0].address;
}

export function debugWalletFeatures() {
    return getWallets().get().map((w) => ({
        name: w.name,
        features: Object.keys(w.features),
        accounts: (w.accounts ?? []).map((a) => a.address),
    }));
}

// -------------------- Read helpers --------------------

export async function getSuiBalance(owner: string) {
    const result = await c().getBalance({
        owner,
        coinType: "0x2::sui::SUI",
    });
    return result;
}

export async function getOwnedObjects(owner: string) {
    const result = await c().listOwnedObjects({ owner });
    return result;
}

export async function getObjectDump(objectId: string) {
    const resp = await c().ledgerService.getObject({
        objectId,
        readMask: {
            paths: [
                "object_id",
                "version",
                "digest",
                "owner",
                "type",
                "data",
                "content",
                "move_object",
                "bcs",
            ],
        },
    });

    const obj = resp.response;
    if (!obj) {
        return {
            objectId,
            rows: [{ name: "(error)", value: "object not found" }],
        };
    }

    const moveJson =
        (obj as any).content?.fields ??
        (obj as any).moveObject?.fields ??
        (obj as any).move_object?.fields ??
        (obj as any).data?.moveObject?.fields ??
        (obj as any).data?.move_object?.fields ??
        null;

    const rows: Array<{ name: string; value: string }> = [];

    rows.push({
        name: "object_id",
        value: (obj as any).objectId ?? (obj as any).object_id ?? objectId,
    });

    if ((obj as any).type) {
        rows.push({ name: "type", value: String((obj as any).type) });
    }

    if ((obj as any).version != null) {
        rows.push({ name: "version", value: String((obj as any).version) });
    }

    if ((obj as any).digest) {
        rows.push({ name: "digest", value: String((obj as any).digest) });
    }

    if ((obj as any).owner) {
        rows.push({ name: "owner", value: pretty((obj as any).owner) });
    }

    if (moveJson && typeof moveJson === "object") {
        for (const [k, v] of Object.entries(moveJson)) {
            rows.push({ name: k, value: pretty(v) });
        }
    } else {
        rows.push({ name: "(raw_object)", value: pretty(obj) });
    }

    return { objectId, rows };
}

function pretty(v: any) {
    if (v == null) return "null";
    if (typeof v === "string") return v;

    try {
        return JSON.stringify(v, null, 2);
    } catch {
        return String(v);
    }
}

// -------------------- ROLES --------------------

export async function findOwnedRoleCaps(args: {
    packageId: string;
}) {
    const wallet = pickWallet();
    const accounts = await getConnectedAccounts(wallet);
    const owner = accounts[0].address;

    const client = makeJsonRpcClient();

    const typeString = `${args.packageId}::roles::RoleCap`;

    const resp = await client.getOwnedObjects({
        owner,
        filter: {
            StructType: typeString,
        },
        options: {
            showType: true,
            showContent: true,
        },
    });

    return resp.data ?? [];
}

export async function grantRole(args: {
    packageId: string;
    roleRegistryId: string;
    highExecutorRoleCapId: string;
    roleId: RoleId;
    grantee: string;
}) {
    try {
        console.log("grantRole args", args);

        const { network } = requireInit();
        console.log("grantRole network", network);

        const tx = new Transaction();

        tx.moveCall({
            target: `${args.packageId}::roles::grant_role_as_high_executor`,
            arguments: [
                tx.object(args.roleRegistryId),
                tx.object(args.highExecutorRoleCapId),
                tx.pure.u8(args.roleId),
                tx.pure.address(args.grantee),
            ],
        });

        tx.setGasBudget(50_000_000);

        return await signAndExecuteViaApi(network, tx);
    }
    catch (err) {
        console.error("grantRole failed", err);
        throw err;
    }
}

export async function revokeRole(args: {
    packageId: string;
    roleRegistryId: string;
    highExecutorRoleCapId: string;
    roleCapId: string;
}) {
    try {
        console.log("revokeRole args", args);
        const { network } = requireInit();
        console.log("revokeRole network", network);

        const tx = new Transaction();

        tx.moveCall({
            target: `${args.packageId}::roles::revoke_role_as_high_executor`,
            arguments: [
                tx.object(args.roleRegistryId),
                tx.object(args.highExecutorRoleCapId),
                tx.object(args.roleCapId),
            ],
        });

        tx.setGasBudget(50_000_000);

        return await signAndExecuteViaApi(network, tx);
    }
    catch (err) {
        console.error("revokeRole failed", err);
        throw err;
    }
}

export async function getRoleCapId(args: {
    packageId: string;
    roleRegistryId: string;
    grantee: string;
    roleId: RoleId;
}) {
    throw new Error(
        "getRoleCapId requires a dev-inspect helper or service-layer query. " +
        "For now, query roles via API/GraphQL or track the role cap from the grant transaction result."
    );
}

export async function hasRole(args: {
    packageId: string;
    roleRegistryId: string;
    grantee: string;
    roleId: RoleId;
}) {
    throw new Error(
        "hasRole requires a Move read helper via dev-inspect or a service-layer GraphQL query."
    );
}

export function extractCreatedRoleCapId(txResult: any): string | null {
    const changes = txResult?.objectChanges;
    if (!Array.isArray(changes)) return null;

    for (const change of changes) {
        if (
            change?.type === "created" &&
            typeof change?.objectType === "string" &&
            change.objectType.endsWith("::roles::RoleCap") &&
            typeof change?.objectId === "string"
        ) {
            return change.objectId;
        }
    }

    return null;
}

// INVENTORY

export async function setItemConfig(args: {
    packageId: string;
    itemConfigRegistryId: string;
    roleCapId: string;
    itemId: number;
    displayName: string;
    compliancePoints: number;
    essentialMultiplier: number;
    isEnabled: boolean;
}) {
    const { network } = requireInit();

    const tx = new Transaction();

    tx.moveCall({
        target: `${args.packageId}::items::set_item_config_as_role_manager`,
        arguments: [
            tx.object(args.itemConfigRegistryId),
            tx.object(args.roleCapId),
            tx.pure.u64(args.itemId),
            tx.pure.string(args.displayName),
            tx.pure.u64(args.compliancePoints),
            tx.pure.u64(args.essentialMultiplier),
            tx.pure.bool(args.isEnabled),
        ],
    });

    tx.setGasBudget(50_000_000);

    return await signAndExecuteViaApi(network, tx);
}

export async function removeItemConfig(args: {
    packageId: string;
    itemConfigRegistryId: string;
    adminCapId: string;
    itemId: number;
}) {
    const { network } = requireInit();

    const tx = new Transaction();

    tx.moveCall({
        target: `${args.packageId}::items::remove_item_config_as_role_manager`,
        arguments: [
            tx.object(args.itemConfigRegistryId),
            tx.object(args.adminCapId),
            tx.pure.u64(args.itemId),
        ],
    });

    tx.setGasBudget(50_000_000);

    return await signAndExecuteViaApi(network, tx);
}

// -------------------- JSON-RPC lookup helpers --------------------

export async function findOwnedObjectIdByType(args: {
    packageId: string;
    module: string;
    objectName: string;
}) {
    const wallet = pickWallet();
    const accounts = await getConnectedAccounts(wallet);

    const owner = accounts[0].address;
    const client = makeJsonRpcClient();

    const typeString = `${args.packageId}::${args.module}::${args.objectName}`;

    const resp = await client.getOwnedObjects({
        owner,
        filter: {
            StructType: typeString,
        },
        options: {
            showType: true,
        },
    });

    const obj = resp.data?.[0];

    if (!obj?.data?.objectId) {
        throw new Error(`No owned object of type ${typeString} found.`);
    }

    return obj.data.objectId;
}

// -------------------- sign transaction --------------------

async function signAndExecuteViaApi(network: Network, tx: Transaction) {
    try {
        const wallet = pickWallet();
        const accounts = await getConnectedAccounts(wallet);
        const account = accounts[0];

        const signFeature =
            wallet.features[SuiSignTransaction] as
            | SuiSignTransactionFeature[typeof SuiSignTransaction]
            | undefined;

        if (!signFeature) {
            return { success: false, error: "Wallet does not support sui:signTransaction" };
        }

        const signed = await signFeature.signTransaction({
            account,
            chain: `sui:${network}`,
            transaction: tx,
        });

        const apiBaseUrl = requireApiBaseUrl();

        const response = await fetch(`${apiBaseUrl}api/sui/execute`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                network,
                txBytesBase64: signed.bytes,
                signaturesBase64: [signed.signature],
            }),
        });

        const text = await response.text();

        if (!response.ok) {
            let message = text;

            try {
                const problem = JSON.parse(text);
                message = problem.detail ?? problem.title ?? text;
            } catch {
                // keep raw text
            }

            return { success: false, error: message };
        }

        return {
            success: true,
            data: JSON.parse(text)
        };
    }
    catch (err) {
        return {
            success: false,
            error: err instanceof Error ? err.message : String(err)
        };
    }
}

// -------------------- Move method calls --------------------

export async function setResourceConfig(args: {
    packageId: string;
    extensionConfigId: string;
    adminCapId: string;
    typeId: string | number | bigint;
    itemId: string | number | bigint;
    label: string;
    enabled: boolean;
}) {
    const { network } = requireInit();

    const tx = new Transaction();

    tx.moveCall({
        target: `${args.packageId}::resources::set_resource_config`,
        arguments: [
            tx.object(args.extensionConfigId),
            tx.object(args.adminCapId),
            tx.pure.u64(args.typeId),
            tx.pure.u64(args.itemId),
            tx.pure.string(args.label),
            tx.pure.bool(args.enabled),
        ],
    });

    return await signAndExecuteViaApi(network, tx);
}

export async function setComplianceConfig(args: {
    packageId: string;
    extensionConfigId: string;
    adminCapId: string;
    typeId: string | number | bigint;
    cpAwarded: string | number | bigint;
    essentialMultiplier: string | number | bigint;
}) {
    const { network } = requireInit();

    const tx = new Transaction();

    tx.moveCall({
        target: `${args.packageId}::compliance::set_compliance_config`,
        arguments: [
            tx.object(args.extensionConfigId),
            tx.object(args.adminCapId),
            tx.pure.u64(args.typeId),
            tx.pure.u64(args.cpAwarded),
            tx.pure.u64(args.essentialMultiplier),
        ],
    });

    return await signAndExecuteViaApi(network, tx);
}

export async function setGateCostConfig(args: {
    packageId: string;
    extensionConfigId: string;
    adminCapId: string;
    localJumpCp: string | number | bigint;
    regionalJumpCp: string | number | bigint;
    longRangeJumpCp: string | number | bigint;
}) {
    const { network } = requireInit();

    const tx = new Transaction();

    tx.moveCall({
        target: `${args.packageId}::gate_costs::set_gate_cost_config`,
        arguments: [
            tx.object(args.extensionConfigId),
            tx.object(args.adminCapId),
            tx.pure.u64(args.localJumpCp),
            tx.pure.u64(args.regionalJumpCp),
            tx.pure.u64(args.longRangeJumpCp),
        ],
    });

    return await signAndExecuteViaApi(network, tx);
}

export async function setFullItemConfig(args: {
    packageId: string;
    extensionConfigId: string;
    adminCapId: string;
    typeId: string | number | bigint;
    itemId: string | number | bigint;
    label: string;
    enabled: boolean;
    cpAwarded: string | number | bigint;
    essentialMultiplier: string | number | bigint;
}) {
    const { network } = requireInit();

    const tx = new Transaction();

    tx.moveCall({
        target: `${args.packageId}::resources::set_resource_config`,
        arguments: [
            tx.object(args.extensionConfigId),
            tx.object(args.adminCapId),
            tx.pure.u64(args.typeId),
            tx.pure.u64(args.itemId),
            tx.pure.string(args.label),
            tx.pure.bool(args.enabled),
        ],
    });

    tx.moveCall({
        target: `${args.packageId}::compliance::set_compliance_config`,
        arguments: [
            tx.object(args.extensionConfigId),
            tx.object(args.adminCapId),
            tx.pure.u64(args.typeId),
            tx.pure.u64(args.cpAwarded),
            tx.pure.u64(args.essentialMultiplier),
        ],
    });

    return await signAndExecuteViaApi(network, tx);
}


export { };