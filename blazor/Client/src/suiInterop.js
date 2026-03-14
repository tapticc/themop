import { SuiGrpcClient } from "@mysten/sui/grpc";
import { getWallets, SuiSignTransaction, } from "@mysten/wallet-standard";
import { Transaction } from "@mysten/sui/transactions";
import { StandardConnect, } from "@wallet-standard/features";
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
// -------------------- Shared runtime state --------------------
let grpcClient = null;
let currentNetwork = null;
let currentRpcUrl = null;
let preferredWalletName = null;
// -------------------- Init / client access --------------------
export function init(network, rpcUrl, preferredWallet) {
    currentNetwork = network;
    currentRpcUrl = rpcUrl;
    preferredWalletName = preferredWallet;
    grpcClient = new SuiGrpcClient({
        network,
        baseUrl: rpcUrl,
    });
}
function requireInit() {
    if (!currentNetwork || !currentRpcUrl) {
        throw new Error("suiInterop.init(network, rpcUrl) must be called before using Sui interop.");
    }
    return {
        network: currentNetwork,
        rpcUrl: currentRpcUrl,
    };
}
function c() {
    if (!grpcClient) {
        const { network, rpcUrl } = requireInit();
        grpcClient = new SuiGrpcClient({
            network,
            baseUrl: rpcUrl,
        });
    }
    return grpcClient;
}
function makeJsonRpcClient() {
    const { network, rpcUrl } = requireInit();
    return new SuiJsonRpcClient({
        network,
        url: rpcUrl,
    });
}
// -------------------- Wallet helpers --------------------
//preferredWalletName comes from appsettings.json for localnet, testnet etc.
export function pickWallet(preferredName = preferredWalletName) {
    const wallets = getWallets().get();
    if (!wallets.length) {
        throw new Error("No Sui wallets found.");
    }
    const preferred = wallets.find((w) => w.name === preferredName &&
        !!w.features[StandardConnect] &&
        !!w.features[SuiSignTransaction]);
    if (preferred)
        return preferred;
    const compatible = wallets.find((w) => !!w.features[StandardConnect] &&
        !!w.features[SuiSignTransaction]);
    if (compatible)
        return compatible;
    const legacy = wallets.find((w) => !!w.features[StandardConnect] &&
        !!w.features["sui:signTransactionBlock"]);
    if (legacy) {
        throw new Error(`Wallet "${legacy.name}" only exposes deprecated legacy signing (sui:signTransactionBlock).`);
    }
    const names = wallets.map((w) => w.name).join(", ");
    throw new Error(`No compatible wallet found. Detected: ${names}. Need standard:connect + sui:signTransaction.`);
}
async function getConnectedAccounts(wallet) {
    let accounts = wallet.accounts ?? [];
    if (!accounts.length) {
        const connectFeature = wallet.features[StandardConnect];
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
export async function connectSui() {
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
export async function getSuiBalance(owner) {
    const result = await c().getBalance({
        owner,
        coinType: "0x2::sui::SUI",
    });
    return result;
}
export async function getOwnedObjects(owner) {
    const result = await c().listOwnedObjects({ owner });
    return result;
}
export async function getObjectDump(objectId) {
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
    const moveJson = obj.content?.fields ??
        obj.moveObject?.fields ??
        obj.move_object?.fields ??
        obj.data?.moveObject?.fields ??
        obj.data?.move_object?.fields ??
        null;
    const rows = [];
    rows.push({
        name: "object_id",
        value: obj.objectId ?? obj.object_id ?? objectId,
    });
    if (obj.type) {
        rows.push({ name: "type", value: String(obj.type) });
    }
    if (obj.version != null) {
        rows.push({ name: "version", value: String(obj.version) });
    }
    if (obj.digest) {
        rows.push({ name: "digest", value: String(obj.digest) });
    }
    if (obj.owner) {
        rows.push({ name: "owner", value: pretty(obj.owner) });
    }
    if (moveJson && typeof moveJson === "object") {
        for (const [k, v] of Object.entries(moveJson)) {
            rows.push({ name: k, value: pretty(v) });
        }
    }
    else {
        rows.push({ name: "(raw_object)", value: pretty(obj) });
    }
    return { objectId, rows };
}
function pretty(v) {
    if (v == null)
        return "null";
    if (typeof v === "string")
        return v;
    try {
        return JSON.stringify(v, null, 2);
    }
    catch {
        return String(v);
    }
}
// -------------------- ROLES --------------------
export async function findOwnedRoleCaps(args) {
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
export async function grantRole(args) {
    const { network } = requireInit();
    const tx = new Transaction();
    tx.moveCall({
        target: `${args.packageId}::roles::grant_role`,
        arguments: [
            tx.object(args.roleRegistryId),
            tx.object(args.roleAdminCapId),
            tx.pure.u8(args.roleId),
            tx.pure.address(args.grantee),
        ],
    });
    return await signAndExecuteViaApi(network, tx);
}
export async function revokeRole(args) {
    const { network } = requireInit();
    const tx = new Transaction();
    tx.moveCall({
        target: `${args.packageId}::roles::revoke_role`,
        arguments: [
            tx.object(args.roleRegistryId),
            tx.object(args.roleAdminCapId),
            tx.object(args.roleCapId),
        ],
    });
    return await signAndExecuteViaApi(network, tx);
}
export async function getRoleCapId(args) {
    throw new Error("getRoleCapId requires a dev-inspect helper or service-layer query. " +
        "For now, query roles via API/GraphQL or track the role cap from the grant transaction result.");
}
export async function hasRole(args) {
    throw new Error("hasRole requires a Move read helper via dev-inspect or a service-layer GraphQL query.");
}
export function extractCreatedRoleCapId(txResult) {
    const changes = txResult?.objectChanges;
    if (!Array.isArray(changes))
        return null;
    for (const change of changes) {
        if (change?.type === "created" &&
            typeof change?.objectType === "string" &&
            change.objectType.endsWith("::roles::RoleCap") &&
            typeof change?.objectId === "string") {
            return change.objectId;
        }
    }
    return null;
}
// -------------------- JSON-RPC lookup helpers --------------------
export async function findOwnedObjectIdByType(args) {
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
async function signAndExecuteViaApi(network, tx) {
    const wallet = pickWallet();
    const accounts = await getConnectedAccounts(wallet);
    const account = accounts[0];
    const signFeature = wallet.features[SuiSignTransaction];
    if (!signFeature) {
        throw new Error("Wallet does not support sui:signTransaction");
    }
    const signed = await signFeature.signTransaction({
        account,
        chain: `sui:${network}`,
        transaction: tx,
    });
    // Adjust this URL if your API base differs
    const response = await fetch("/api/sui/execute", {
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
    if (!response.ok) {
        const body = await response.text();
        console.error(body);
        throw new Error(`Execute failed: ${response.status} ${body}`);
    }
    return await response.json();
}
// -------------------- Move method calls --------------------
export async function setResourceConfig(args) {
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
export async function setComplianceConfig(args) {
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
export async function setGateCostConfig(args) {
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
export async function setFullItemConfig(args) {
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
