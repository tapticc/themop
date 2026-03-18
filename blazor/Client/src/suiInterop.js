import { getWallets, signTransaction, signAndExecuteTransaction, SUI_TESTNET_CHAIN, SUI_DEVNET_CHAIN, SUI_MAINNET_CHAIN, SUI_LOCALNET_CHAIN, StandardConnect, SuiSignAndExecuteTransaction, SuiSignTransaction, } from "@mysten/wallet-standard";
import { Transaction } from "@mysten/sui/transactions";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
// -------------------- Shared runtime state --------------------
let grpcClient = null;
let jsonRpcClient = null;
let currentNetwork = null;
let currentRpcUrl = null;
let preferredWalletName = null;
// -------------------- Init / client access --------------------
function getChain(network) {
    switch (network) {
        case "testnet":
            return SUI_TESTNET_CHAIN;
        case "devnet":
            return SUI_DEVNET_CHAIN;
        case "mainnet":
            return SUI_MAINNET_CHAIN;
        case "localnet":
            return SUI_LOCALNET_CHAIN;
    }
}
export function init(network, rpcUrl, preferredWallet) {
    currentNetwork = network;
    currentRpcUrl = rpcUrl;
    preferredWalletName = preferredWallet;
    // Reads only:
    grpcClient = new SuiGrpcClient({
        network,
        baseUrl: rpcUrl,
    });
    // Transaction resolution / execution:
    jsonRpcClient = new SuiJsonRpcClient({
        network,
        url: rpcUrl,
    });
}
function requireInit() {
    if (!currentNetwork || !currentRpcUrl) {
        throw new Error("suiInterop.init(network, rpcUrl, preferredWallet) must be called before using Sui interop.");
    }
    return {
        network: currentNetwork,
        rpcUrl: currentRpcUrl,
    };
}
function GrpcClient() {
    if (!grpcClient) {
        const { network, rpcUrl } = requireInit();
        grpcClient = new SuiGrpcClient({
            network,
            baseUrl: rpcUrl,
        });
    }
    return grpcClient;
}
function JsonClient() {
    if (!jsonRpcClient) {
        const { network, rpcUrl } = requireInit();
        jsonRpcClient = new SuiJsonRpcClient({
            network,
            url: rpcUrl,
        });
    }
    return jsonRpcClient;
}
// -------------------- Wallet helpers --------------------
export function pickWallet(preferredName = preferredWalletName) {
    const wallets = getWallets().get();
    if (!wallets.length) {
        throw new Error("No Sui wallets found.");
    }
    const isCompatible = (w) => !!w.features[StandardConnect] &&
        (!!w.features[SuiSignTransaction] ||
            !!w.features[SuiSignAndExecuteTransaction]);
    const preferred = wallets.find((w) => w.name === preferredName && isCompatible(w));
    if (preferred)
        return preferred;
    const compatible = wallets.find(isCompatible);
    if (compatible)
        return compatible;
    const names = wallets.map((w) => w.name).join(", ");
    throw new Error(`No compatible wallet found. Detected: ${names}. Need standard:connect + sui signing feature.`);
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
        accounts: (w.accounts ?? []).map((a) => ({
            address: a.address,
            chains: a.chains,
        })),
    }));
}
// -------------------- Read helpers (gRPC only) --------------------
export async function getSuiBalance(owner) {
    return await GrpcClient().getBalance({
        owner,
        coinType: "0x2::sui::SUI",
    });
}
export async function getOwnedObjects(owner) {
    return await GrpcClient().listOwnedObjects({ owner });
}
export async function getObjectDump(objectId) {
    const resp = await GrpcClient().ledgerService.getObject({
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
// -------------------- JSON-RPC lookup helpers --------------------
export async function findOwnedRoleCaps(args) {
    const wallet = pickWallet();
    const accounts = await getConnectedAccounts(wallet);
    const owner = accounts[0].address;
    const typeString = `${args.packageId}::roles::RoleCap`;
    const resp = await JsonClient().getOwnedObjects({
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
export async function findOwnedObjectIdByType(args) {
    const wallet = pickWallet();
    const accounts = await getConnectedAccounts(wallet);
    const owner = accounts[0].address;
    const typeString = `${args.packageId}::${args.module}::${args.objectName}`;
    const resp = await JsonClient().getOwnedObjects({
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
// -------------------- Signing / execution --------------------
async function signAndExecuteClientOnly(network, tx) {
    const wallet = pickWallet();
    const accounts = await getConnectedAccounts(wallet);
    const chain = getChain(network);
    const account = accounts.find((a) => a.chains.includes(chain)) ??
        accounts[0];
    try {
        tx.setSender(account.address);
        // Best path: wallet signs and executes.
        if (wallet.features[SuiSignAndExecuteTransaction]) {
            const result = await signAndExecuteTransaction(wallet, {
                account,
                chain,
                transaction: tx,
            });
            return {
                success: true,
                data: result,
            };
        }
        // Fallback path: wallet signs, app executes over JSON-RPC.
        const signed = await signTransaction(wallet, {
            account,
            chain,
            transaction: tx,
        });
        const exec = await JsonClient().executeTransactionBlock({
            transactionBlock: signed.bytes,
            signature: signed.signature,
            options: {
                showRawEffects: true,
                showEffects: true,
                showObjectChanges: true,
                showBalanceChanges: true,
            },
        });
        return {
            success: true,
            data: exec,
        };
    }
    catch (err) {
        return {
            success: false,
            error: err instanceof Error ? err.message : String(err),
        };
    }
}
// -------------------- ROLES --------------------
export async function grantRole(args) {
    try {
        const { network } = requireInit();
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
        tx.setGasBudget(50000000);
        return await signAndExecuteClientOnly(network, tx);
    }
    catch (err) {
        console.error("grantRole failed", err);
        throw err;
    }
}
export async function revokeRole(args) {
    try {
        const { network } = requireInit();
        const tx = new Transaction();
        tx.moveCall({
            target: `${args.packageId}::roles::revoke_role_as_high_executor`,
            arguments: [
                tx.object(args.roleRegistryId),
                tx.object(args.highExecutorRoleCapId),
                tx.object(args.roleCapId),
            ],
        });
        tx.setGasBudget(50000000);
        return await signAndExecuteClientOnly(network, tx);
    }
    catch (err) {
        console.error("revokeRole failed", err);
        throw err;
    }
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
// -------------------- INVENTORY --------------------
export async function setItemConfig(args) {
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
    tx.setGasBudget(50000000);
    return await signAndExecuteClientOnly(network, tx);
}
export async function removeItemConfig(args) {
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
    tx.setGasBudget(50000000);
    return await signAndExecuteClientOnly(network, tx);
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
    tx.setGasBudget(50000000);
    return await signAndExecuteClientOnly(network, tx);
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
    tx.setGasBudget(50000000);
    return await signAndExecuteClientOnly(network, tx);
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
    tx.setGasBudget(50000000);
    return await signAndExecuteClientOnly(network, tx);
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
    tx.setGasBudget(50000000);
    return await signAndExecuteClientOnly(network, tx);
}
