import { SuiGrpcClient } from "@mysten/sui/grpc";
import { getWallets, SuiSignTransaction, } from "@mysten/wallet-standard";
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
function hasModernFeatures(wallet) {
    return !!wallet.features[StandardConnect] && !!wallet.features[SuiSignTransaction];
}
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
