import { getWallets, signTransaction, signAndExecuteTransaction, SUI_TESTNET_CHAIN, SUI_DEVNET_CHAIN, SUI_MAINNET_CHAIN, SUI_LOCALNET_CHAIN, StandardConnect, SuiSignAndExecuteTransaction, SuiSignTransaction, } from "@mysten/wallet-standard";
import { Transaction } from "@mysten/sui/transactions";
import { bcs } from "@mysten/sui/bcs";
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
export async function getCurrentAddress() {
    try {
        const wallet = pickWallet("Eve Vault");
        if (wallet === null) {
            throw new Error("No Sui wallets found.");
        }
        return wallet.accounts[0].address ?? null;
    }
    catch {
        return null;
    }
}
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
function extractOptionValue(value) {
    if (value == null)
        return null;
    if (Array.isArray(value?.vec)) {
        return value.vec.length > 0 ? value.vec[0] : null;
    }
    if (Array.isArray(value?.fields?.vec)) {
        return value.fields.vec.length > 0 ? value.fields.vec[0] : null;
    }
    if (value.Some !== undefined)
        return value.Some;
    if (value.None !== undefined)
        return null;
    return value;
}
function normalizeOwner(owner) {
    if (!owner)
        return null;
    if (typeof owner === "string")
        return owner;
    if (owner.AddressOwner)
        return owner.AddressOwner;
    if (owner.ObjectOwner)
        return owner.ObjectOwner;
    if (owner.Shared)
        return "Shared";
    if (owner.Immutable)
        return "Immutable";
    return JSON.stringify(owner);
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
// -------------------- RESOURCES --------------------
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
//******************** STORAGE ********************/
export async function getStorageUnit(storageUnitId) {
    try {
        const client = JsonClient();
        const result = await client.getObject({
            id: storageUnitId,
            options: {
                showType: true,
                showOwner: true,
                showContent: true,
            },
        });
        const data = result?.data;
        if (!data) {
            const err = result?.error;
            let errorText = "Storage unit " + storageUnitId + " not found :(";
            if (err) {
                if ("code" in err) {
                    errorText = `Object error: ${err.code}`;
                    if ("object_id" in err && err.object_id) {
                        errorText += ` (${err.object_id})`;
                    }
                }
                else {
                    errorText = JSON.stringify(err);
                }
            }
            return {
                found: false,
                error: errorText,
            };
        }
        const fields = data.content?.fields ?? {};
        const metadata = extractOptionValue(fields.metadata);
        const energySource = extractOptionValue(fields.energy_source_id);
        const extension = extractOptionValue(fields.extension);
        let ownerCharacterId = "";
        if (fields?.owner_cap_id) {
            const ownerCapResult = await client.getObject({
                id: fields.owner_cap_id,
                options: {
                    showOwner: true,
                },
            });
            const ownerCapData = ownerCapResult?.data;
            const owner = ownerCapData?.owner;
            if (owner?.AddressOwner) {
                ownerCharacterId = owner.AddressOwner;
            }
            else if (owner?.ObjectOwner) {
                ownerCharacterId = owner.ObjectOwner;
            }
            else if (typeof owner === "string") {
                ownerCharacterId = owner;
            }
        }
        return {
            found: true,
            objectId: data.objectId ?? storageUnitId,
            version: data.version?.toString?.() ?? "",
            digest: data.digest ?? "",
            type: data.type ?? "",
            owner: normalizeOwner(data.owner),
            assemblyItemId: fields?.key?.fields?.item_id ?? fields?.key?.item_id ?? "",
            tenant: fields?.key?.fields?.tenant ?? fields?.key?.tenant ?? "",
            ownerCapId: fields?.owner_cap_id ?? "",
            typeId: fields?.type_id?.toString?.() ?? fields?.type_id ?? "",
            statusJson: JSON.stringify(fields?.status ?? null, null, 2),
            locationJson: JSON.stringify(fields?.location ?? null, null, 2),
            metadataName: metadata?.fields?.name ?? metadata?.name ?? "",
            metadataDescription: metadata?.fields?.description ?? metadata?.description ?? "",
            metadataUrl: metadata?.fields?.url ?? metadata?.url ?? "",
            energySourceId: energySource ?? "",
            extensionType: extension
                ? typeof extension === "string"
                    ? extension
                    : JSON.stringify(extension)
                : "",
            inventoryKeys: Array.isArray(fields?.inventory_keys) ? fields.inventory_keys : [],
            rawJson: JSON.stringify(fields, null, 2),
            ownerCharacterId: ownerCharacterId
        };
    }
    catch (err) {
        return {
            found: false,
            error: err instanceof Error ? err.message : String(err),
        };
    }
}
export async function onlineStorageUnit(args) {
    const { network } = requireInit();
    const tx = new Transaction();
    tx.setGasBudget(50000000);
    console.log("storageUnitId", args.storageUnitId);
    console.log("networkNodeId", args.networkNodeId);
    console.log("energyConfigId", args.energyConfigId);
    console.log("ownerCapId", args.ownerCapId);
    const [storageOwnerCap, returnReceipt] = tx.moveCall({
        target: `${args.worldPackageId}::character::borrow_owner_cap`,
        typeArguments: [`${args.worldPackageId}::storage_unit::StorageUnit`],
        arguments: [
            tx.object(args.characterId),
            tx.object(args.ownerCapId),
        ],
    });
    tx.moveCall({
        target: `${args.worldPackageId}::storage_unit::online`,
        arguments: [
            tx.object(args.storageUnitId),
            tx.object(args.networkNodeId),
            tx.object(args.energyConfigId),
            storageOwnerCap,
        ],
    });
    tx.moveCall({
        target: `${args.worldPackageId}::character::return_owner_cap`,
        typeArguments: [`${args.worldPackageId}::storage_unit::StorageUnit`],
        arguments: [
            tx.object(args.characterId),
            storageOwnerCap,
            returnReceipt,
        ],
    });
    return await signAndExecuteClientOnly(network, tx);
}
export async function offlineStorageUnit(args) {
    const { network } = requireInit();
    const tx = new Transaction();
    tx.setGasBudget(50000000);
    console.log("storageUnitId", args.storageUnitId);
    console.log("networkNodeId", args.networkNodeId);
    console.log("energyConfigId", args.energyConfigId);
    console.log("ownerCapId", args.ownerCapId);
    const [storageOwnerCap, returnReceipt] = tx.moveCall({
        target: `${args.worldPackageId}::character::borrow_owner_cap`,
        typeArguments: [`${args.worldPackageId}::storage_unit::StorageUnit`],
        arguments: [
            tx.object(args.characterId),
            tx.object(args.ownerCapId),
        ],
    });
    tx.moveCall({
        target: `${args.worldPackageId}::storage_unit::offline`,
        arguments: [
            tx.object(args.storageUnitId),
            tx.object(args.networkNodeId),
            tx.object(args.energyConfigId),
            storageOwnerCap,
        ],
    });
    tx.moveCall({
        target: `${args.worldPackageId}::character::return_owner_cap`,
        typeArguments: [`${args.worldPackageId}::storage_unit::StorageUnit`],
        arguments: [
            tx.object(args.characterId),
            storageOwnerCap,
            returnReceipt,
        ],
    });
    return await signAndExecuteClientOnly(network, tx);
}
export async function authorizeSmartStorageExtension(args) {
    const { network } = requireInit();
    const tx = new Transaction();
    tx.setGasBudget(50000000);
    const [storageOwnerCap, returnReceipt] = tx.moveCall({
        target: `${args.worldPackageId}::character::borrow_owner_cap`,
        typeArguments: [`${args.worldPackageId}::storage_unit::StorageUnit`],
        arguments: [
            tx.object(args.characterId),
            tx.object(args.ownerCapId),
        ],
    });
    tx.moveCall({
        target: `${args.worldPackageId}::storage_unit::authorize_extension`,
        typeArguments: [`${args.theMopPackageId}::smart_storage::SmartStorageAuth`],
        arguments: [
            tx.object(args.storageUnitId),
            storageOwnerCap,
        ],
    });
    tx.moveCall({
        target: `${args.worldPackageId}::character::return_owner_cap`,
        typeArguments: [`${args.worldPackageId}::storage_unit::StorageUnit`],
        arguments: [
            tx.object(args.characterId),
            storageOwnerCap,
            returnReceipt,
        ],
    });
    return await signAndExecuteClientOnly(network, tx);
}
export async function updateStorageUnitName(args) {
    const { network } = requireInit();
    const tx = new Transaction();
    tx.setGasBudget(50000000);
    const [storageOwnerCap, returnReceipt] = tx.moveCall({
        target: `${args.worldPackageId}::character::borrow_owner_cap`,
        typeArguments: [`${args.worldPackageId}::storage_unit::StorageUnit`],
        arguments: [
            tx.object(args.characterId),
            tx.object(args.ownerCapId),
        ],
    });
    tx.moveCall({
        target: `${args.worldPackageId}::storage_unit::update_metadata_name`,
        arguments: [
            tx.object(args.storageUnitId),
            storageOwnerCap,
            tx.pure.string(args.name),
        ],
    });
    tx.moveCall({
        target: `${args.worldPackageId}::character::return_owner_cap`,
        typeArguments: [`${args.worldPackageId}::storage_unit::StorageUnit`],
        arguments: [
            tx.object(args.characterId),
            storageOwnerCap,
            returnReceipt,
        ],
    });
    return await signAndExecuteClientOnly(network, tx);
}
export async function updateStorageUnitDescription(args) {
    const { network } = requireInit();
    const tx = new Transaction();
    tx.setGasBudget(50000000);
    const [storageOwnerCap, returnReceipt] = tx.moveCall({
        target: `${args.worldPackageId}::character::borrow_owner_cap`,
        typeArguments: [`${args.worldPackageId}::storage_unit::StorageUnit`],
        arguments: [
            tx.object(args.characterId),
            tx.object(args.ownerCapId),
        ],
    });
    tx.moveCall({
        target: `${args.worldPackageId}::storage_unit::update_metadata_description`,
        arguments: [
            tx.object(args.storageUnitId),
            storageOwnerCap,
            tx.pure.string(args.description),
        ],
    });
    tx.moveCall({
        target: `${args.worldPackageId}::character::return_owner_cap`,
        typeArguments: [`${args.worldPackageId}::storage_unit::StorageUnit`],
        arguments: [
            tx.object(args.characterId),
            storageOwnerCap,
            returnReceipt,
        ],
    });
    return await signAndExecuteClientOnly(network, tx);
}
export async function updateStorageUnitUrl(args) {
    const { network } = requireInit();
    const tx = new Transaction();
    tx.setGasBudget(50000000);
    const [storageOwnerCap, returnReceipt] = tx.moveCall({
        target: `${args.worldPackageId}::character::borrow_owner_cap`,
        typeArguments: [`${args.worldPackageId}::storage_unit::StorageUnit`],
        arguments: [
            tx.object(args.characterId),
            tx.object(args.ownerCapId),
        ],
    });
    tx.moveCall({
        target: `${args.worldPackageId}::storage_unit::update_metadata_url`,
        arguments: [
            tx.object(args.storageUnitId),
            storageOwnerCap,
            tx.pure.string(args.url),
        ],
    });
    tx.moveCall({
        target: `${args.worldPackageId}::character::return_owner_cap`,
        typeArguments: [`${args.worldPackageId}::storage_unit::StorageUnit`],
        arguments: [
            tx.object(args.characterId),
            storageOwnerCap,
            returnReceipt,
        ],
    });
    return await signAndExecuteClientOnly(network, tx);
}
export async function depositConfiguredItemsToOpen(args) {
    const { network } = requireInit();
    const tx = new Transaction();
    tx.setGasBudget(50000000);
    const [characterOwnerCap, returnReceipt] = tx.moveCall({
        target: `${args.worldPackageId}::character::borrow_owner_cap`,
        typeArguments: [`${args.worldPackageId}::character::Character`],
        arguments: [
            tx.object(args.characterId),
            tx.object(args.characterOwnerCapId),
        ],
    });
    tx.moveCall({
        target: `${args.theMopPackageId}::smart_storage::move_configured_player_items_to_open`,
        arguments: [
            tx.object(args.smartStorageRegistryId),
            tx.object(args.itemConfigRegistryId),
            tx.object(args.pointsRegistryId),
            tx.object(args.storageUnitId),
            tx.object(args.characterId),
            characterOwnerCap,
            tx.pure.vector("u64", args.itemIds),
            tx.pure.vector("u32", args.quantities),
        ],
    });
    tx.moveCall({
        target: `${args.worldPackageId}::character::return_owner_cap`,
        typeArguments: [`${args.worldPackageId}::character::Character`],
        arguments: [
            tx.object(args.characterId),
            characterOwnerCap,
            returnReceipt,
        ],
    });
    return await signAndExecuteClientOnly(network, tx);
}
export async function configureStorageAssembly(args) {
    const { network } = requireInit();
    const tx = new Transaction();
    tx.setGasBudget(50000000);
    const [storageOwnerCap, returnReceipt] = tx.moveCall({
        target: `${args.worldPackageId}::character::borrow_owner_cap`,
        typeArguments: [`${args.worldPackageId}::storage_unit::StorageUnit`],
        arguments: [
            tx.object(args.characterId),
            tx.object(args.storageOwnerCapId),
        ],
    });
    tx.moveCall({
        target: `${args.worldPackageId}::storage_unit::authorize_extension`,
        typeArguments: [`${args.theMopPackageId}::smart_storage::SmartStorageAuth`],
        arguments: [
            tx.object(args.storageUnitId),
            storageOwnerCap,
        ],
    });
    tx.moveCall({
        target: `${args.worldPackageId}::storage_unit::update_metadata_name`,
        arguments: [
            tx.object(args.storageUnitId),
            storageOwnerCap,
            tx.pure.string(args.name),
        ],
    });
    tx.moveCall({
        target: `${args.worldPackageId}::storage_unit::update_metadata_description`,
        arguments: [
            tx.object(args.storageUnitId),
            storageOwnerCap,
            tx.pure.string(args.description),
        ],
    });
    tx.moveCall({
        target: `${args.worldPackageId}::storage_unit::update_metadata_url`,
        arguments: [
            tx.object(args.storageUnitId),
            storageOwnerCap,
            tx.pure.string(args.url),
        ],
    });
    tx.moveCall({
        target: `${args.worldPackageId}::character::return_owner_cap`,
        typeArguments: [`${args.worldPackageId}::storage_unit::StorageUnit`],
        arguments: [
            tx.object(args.characterId),
            storageOwnerCap,
            returnReceipt,
        ],
    });
    return await signAndExecuteClientOnly(network, tx);
}
function extractString(value) {
    if (value == null)
        return "";
    if (typeof value === "string")
        return value;
    if (typeof value === "number" || typeof value === "bigint" || typeof value === "boolean") {
        return String(value);
    }
    return JSON.stringify(value);
}
function tryGetField(fields, ...names) {
    for (const name of names) {
        if (fields && fields[name] !== undefined)
            return fields[name];
        if (fields?.fields && fields.fields[name] !== undefined)
            return fields.fields[name];
    }
    return null;
}
function normalizeTypeName(value) {
    if (!value)
        return "";
    if (typeof value === "string") {
        try {
            const parsed = JSON.parse(value);
            if (parsed?.fields?.name) {
                return String(parsed.fields.name);
            }
        }
        catch {
            return value;
        }
        return value;
    }
    if (value?.fields?.name) {
        return String(value.fields.name);
    }
    return JSON.stringify(value);
}
function normalizeStorageMetadata(fields) {
    const metadata = extractOptionValue(fields?.metadata);
    const extension = extractOptionValue(fields?.extension);
    return {
        metadataUrl: metadata?.fields?.url ?? metadata?.url ?? "",
        extensionType: normalizeTypeName(extension),
    };
}
function normalizeInventoryLabel(key, storageOwnerCapId, characterOwnerCapId, openInventoryKey) {
    if (key === storageOwnerCapId)
        return "Main Inventory";
    if (key === openInventoryKey)
        return "Open Inventory";
    if (key === characterOwnerCapId)
        return "Player Inventory";
    return "Other Player Inventory";
}
async function loadInventoryItems(client, storageUnitId, inventoryKey) {
    const inventoryObjectResult = await client.getDynamicFieldObject({
        parentId: storageUnitId,
        name: {
            type: "0x2::object::ID",
            value: inventoryKey,
        },
    });
    const inventoryObjectData = inventoryObjectResult?.data;
    if (!inventoryObjectData) {
        return {
            hasInventory: false,
            inventoryObjectId: "",
            items: [],
        };
    }
    const inventoryObjectId = inventoryObjectData.objectId ??
        inventoryObjectData.data?.objectId ??
        "";
    const dynamicFields = await client.getDynamicFields({
        parentId: inventoryObjectId,
    });
    const items = [];
    for (const entry of dynamicFields.data ?? []) {
        const itemId = extractString(entry?.name?.value) ||
            extractString(entry?.name);
        const objectId = entry?.objectId ?? "";
        let quantity = "";
        let rawJson = "";
        if (objectId) {
            const obj = await client.getObject({
                id: objectId,
                options: {
                    showContent: true,
                },
            });
            const objData = obj?.data;
            const fields = objData?.content?.fields ?? {};
            quantity = extractString(tryGetField(fields, "quantity", "amount", "balance", "count"));
            rawJson = JSON.stringify(fields, null, 2);
        }
        items.push({
            itemId,
            quantity,
            objectId,
            rawJson,
        });
    }
    return {
        hasInventory: true,
        inventoryObjectId,
        items,
    };
}
export async function moveOpenItemsToMain(args) {
    const { network } = requireInit();
    const tx = new Transaction();
    tx.setGasBudget(50000000);
    tx.moveCall({
        target: `${args.theMopPackageId}::smart_storage::move_open_items_to_main`,
        arguments: [
            tx.object(args.smartStorageRegistryId),
            tx.object(args.itemConfigRegistryId),
            tx.object(args.roleCapId),
            tx.object(args.storageUnitId),
            tx.object(args.characterId),
            tx.pure.vector("u64", args.itemIds),
            tx.pure.vector("u32", args.quantities),
        ],
    });
    return await signAndExecuteClientOnly(network, tx);
}
export async function getStorageInventories(args) {
    try {
        const client = JsonClient();
        const storageResult = await client.getObject({
            id: args.storageUnitId,
            options: {
                showType: true,
                showContent: true,
            },
        });
        const storageData = storageResult?.data;
        if (!storageData) {
            return {
                found: false,
                error: "Storage unit not found.",
            };
        }
        const storageFields = storageData.content?.fields ?? {};
        const meta = normalizeStorageMetadata(storageFields);
        const expectedPkg = args.theMopPackageId.toLowerCase().replace(/^0x/, "");
        const extensionType = meta.extensionType ?? "";
        const hasSmartStorageExtension = extensionType.toLowerCase().includes("smart_storage::smartstorageauth") &&
            extensionType.toLowerCase().includes(expectedPkg);
        const storageOwnerCapId = extractString(storageFields?.owner_cap_id);
        const openInventoryKey = await getOpenStorageKey(client, args.worldPackageId, args.storageUnitId);
        const dynamicFieldsResult = await client.getDynamicFields({
            parentId: args.storageUnitId,
        });
        const inventories = [];
        const inventoryKeys = [];
        for (const entry of dynamicFieldsResult.data ?? []) {
            const keyValue = extractString(entry?.name?.value) ||
                extractString(entry?.name);
            if (!keyValue)
                continue;
            inventoryKeys.push(keyValue);
            const obj = await client.getDynamicFieldObject({
                parentId: args.storageUnitId,
                name: {
                    type: "0x2::object::ID",
                    value: keyValue,
                },
            });
            const data = obj?.data;
            const contentFields = data?.content?.fields ?? {};
            const itemsContents = contentFields?.value?.fields?.items?.fields?.contents ?? [];
            const items = itemsContents.map((x) => ({
                itemId: extractString(x?.fields?.value?.fields?.type_id ?? x?.key),
                quantity: extractString(x?.fields?.value?.fields?.quantity),
                objectId: extractString(x?.fields?.value?.fields?.item_id),
                rawJson: JSON.stringify(x?.fields?.value ?? {}, null, 2),
            }));
            inventories.push({
                key: keyValue,
                label: normalizeInventoryLabel(keyValue, storageOwnerCapId, args.characterOwnerCapId, openInventoryKey),
                hasInventory: true,
                inventoryObjectId: "",
                items,
                usedCapacity: extractString(contentFields?.value?.fields?.used_capacity),
                maxCapacity: extractString(contentFields?.value?.fields?.max_capacity),
            });
        }
        return {
            found: true,
            hasSmartStorageExtension,
            hasThemopUrl: meta.metadataUrl.startsWith("themop.dev"),
            metadataUrl: meta.metadataUrl,
            extensionType: meta.extensionType,
            storageOwnerCapId,
            openInventoryKey,
            inventoryKeys,
            inventories,
        };
    }
    catch (err) {
        return {
            found: false,
            error: err instanceof Error ? err.message : String(err),
        };
    }
}
async function resolveDevInspectSender() {
    return (await getCurrentAddress()) ?? "0x0";
}
async function devInspectMoveCallFirstReturnValueBytes(client, params) {
    const tx = new Transaction();
    tx.moveCall({
        target: params.target,
        typeArguments: params.typeArguments,
        arguments: params.arguments(tx),
    });
    const result = await client.devInspectTransactionBlock({
        sender: await resolveDevInspectSender(),
        transactionBlock: tx,
    });
    if (result.effects?.status?.status !== "success") {
        return null;
    }
    const returnValues = result.results?.[0]?.returnValues;
    if (!returnValues?.length)
        return null;
    const [valueBytes] = returnValues[0];
    return Uint8Array.from(valueBytes);
}
async function getOpenStorageKey(client, worldPackageId, storageUnitId) {
    const bytes = await devInspectMoveCallFirstReturnValueBytes(client, {
        target: `${worldPackageId}::storage_unit::open_storage_key`,
        arguments: (tx) => [tx.object(storageUnitId)],
    });
    if (!bytes) {
        return "";
    }
    return bcs.Address.parse(bytes);
}
//////////////////// GATES
export async function getGate(gateId) {
    try {
        const client = JsonClient();
        const result = await client.getObject({
            id: gateId,
            options: {
                showType: true,
                showOwner: true,
                showContent: true,
            },
        });
        const data = result?.data;
        if (!data) {
            return {
                found: false,
                error: "Gate not found.",
            };
        }
        const fields = data.content?.fields ?? {};
        const metadata = extractOptionValue(fields.metadata);
        const extension = extractOptionValue(fields.extension);
        let ownerCharacterId = "";
        if (fields?.owner_cap_id) {
            const ownerCapResult = await client.getObject({
                id: fields.owner_cap_id,
                options: { showOwner: true },
            });
            const ownerCapData = ownerCapResult?.data;
            const owner = ownerCapData?.owner;
            if (owner?.AddressOwner) {
                ownerCharacterId = owner.AddressOwner;
            }
            else if (owner?.ObjectOwner) {
                ownerCharacterId = owner.ObjectOwner;
            }
        }
        const linkedGate = fields?.linked_gate_id?.fields?.vec?.[0] ??
            fields?.linked_gate_id?.vec?.[0] ??
            "";
        return {
            found: true,
            objectId: data.objectId ?? gateId,
            ownerCapId: fields?.owner_cap_id ?? "",
            ownerCharacterId,
            metadataName: metadata?.fields?.name ?? metadata?.name ?? "",
            metadataDescription: metadata?.fields?.description ?? metadata?.description ?? "",
            metadataUrl: metadata?.fields?.url ?? metadata?.url ?? "",
            extensionType: extension
                ? typeof extension === "string"
                    ? extension
                    : JSON.stringify(extension)
                : "",
            rawJson: JSON.stringify(fields, null, 2),
            linkedGateId: linkedGate,
        };
    }
    catch (err) {
        return {
            found: false,
            error: err instanceof Error ? err.message : String(err),
        };
    }
}
export async function configureGateAssembly(args) {
    const { network } = requireInit();
    const tx = new Transaction();
    tx.setGasBudget(50000000);
    const [gateOwnerCap, returnReceipt] = tx.moveCall({
        target: `${args.worldPackageId}::character::borrow_owner_cap`,
        typeArguments: [`${args.worldPackageId}::gate::Gate`],
        arguments: [
            tx.object(args.characterId),
            tx.object(args.gateOwnerCapId),
        ],
    });
    tx.moveCall({
        target: `${args.worldPackageId}::gate::authorize_extension`,
        typeArguments: [`${args.theMopPackageId}::gate_config::GateAuth`],
        arguments: [
            tx.object(args.gateId),
            gateOwnerCap,
        ],
    });
    tx.moveCall({
        target: `${args.worldPackageId}::gate::update_metadata_name`,
        arguments: [
            tx.object(args.gateId),
            gateOwnerCap,
            tx.pure.string(args.name),
        ],
    });
    tx.moveCall({
        target: `${args.worldPackageId}::gate::update_metadata_description`,
        arguments: [
            tx.object(args.gateId),
            gateOwnerCap,
            tx.pure.string(args.description),
        ],
    });
    tx.moveCall({
        target: `${args.worldPackageId}::gate::update_metadata_url`,
        arguments: [
            tx.object(args.gateId),
            gateOwnerCap,
            tx.pure.string(args.url),
        ],
    });
    tx.moveCall({
        target: `${args.worldPackageId}::character::return_owner_cap`,
        typeArguments: [`${args.worldPackageId}::gate::Gate`],
        arguments: [
            tx.object(args.characterId),
            gateOwnerCap,
            returnReceipt,
        ],
    });
    return await signAndExecuteClientOnly(network, tx);
}
export async function getGatePermitConfig(args) {
    try {
        const client = JsonClient();
        const result = await client.getObject({
            id: args.registryId,
            options: {
                showContent: true,
            },
        });
        const data = result?.data;
        if (!data) {
            return {
                found: false,
                error: "Gate permit registry not found.",
            };
        }
        const fields = data.content?.fields ?? {};
        return {
            found: true,
            permitCostCompliancePoints: Number(fields?.permit_cost_compliance_points ?? 0),
            linkedPointsRegistryId: fields?.linked_points_registry_id?.fields?.vec?.[0] ??
                fields?.linked_points_registry_id ??
                "",
            rawJson: JSON.stringify(fields, null, 2),
        };
    }
    catch (err) {
        return {
            found: false,
            error: err instanceof Error ? err.message : String(err),
        };
    }
}
export async function purchaseJumpPermit(args) {
    const { network } = requireInit();
    const tx = new Transaction();
    tx.setGasBudget(50000000);
    tx.moveCall({
        target: `${args.theMopPackageId}::gate_permits::purchase_jump_permit`,
        arguments: [
            tx.object(args.gatePermitRegistryId),
            tx.object(args.pointsRegistryId),
            tx.object(args.sourceGateId),
            tx.object(args.destinationGateId),
            tx.object(args.characterId),
            tx.pure.u64(args.expiresAtTimestampMs),
        ],
    });
    return await signAndExecuteClientOnly(network, tx);
}
