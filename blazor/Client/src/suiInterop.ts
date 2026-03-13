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

// -------------------- Init / client access --------------------

export function init(network: Network, rpcUrl: string, preferredWallet: string) {
	currentNetwork = network;
	currentRpcUrl = rpcUrl;
	preferredWalletName = preferredWallet;

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

// -------------------- Wallet helpers --------------------

function hasModernFeatures(wallet: Wallet): wallet is CompatibleWallet {
	return !!wallet.features[StandardConnect] && !!wallet.features[SuiSignTransaction];
}

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

export { };