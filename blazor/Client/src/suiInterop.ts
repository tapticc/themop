import { SuiGrpcClient } from "@mysten/sui/grpc";
import {
	getWallets, SuiSignTransaction,
	type SuiSignTransactionFeature } from "@mysten/wallet-standard";
import { Transaction } from "@mysten/sui/transactions";
import {
	StandardConnect,
	type StandardConnectFeature,
} from "@wallet-standard/features";
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";

// -------------------- Read (gRPC) --------------------

let client: SuiGrpcClient | null = null;

export function init(
	network: "mainnet" | "testnet" | "devnet" | "localnet" = "localnet"
) {
	const baseUrl =
		network === "localnet"
			// If your local gRPC is on a different port, change it here.
			? "http://127.0.0.1:9000"
			: `https://fullnode.${network}.sui.io:443`;

	client = new SuiGrpcClient({
		network,
		baseUrl,
	});
}

function c(): SuiGrpcClient {
	if (!client) init("localnet");
	return client!;
}

export async function connectSuiLocalDev(): Promise<string> {
	const wallet = pickWallet();

	const connectFeature =
		wallet.features[StandardConnect] as
		| StandardConnectFeature[typeof StandardConnect]
		| undefined;

	if (!connectFeature) {
		throw new Error("Wallet does not support standard:connect");
	}

	const result = await connectFeature.connect();
	const accounts = result.accounts;

	if (!accounts?.length) {
		throw new Error("No accounts returned from wallet.");
	}

	return accounts[0].address;
}

export async function getSuiBalance(owner: string) {
	const result = await c().getBalance({ owner, coinType: "0x2::sui::SUI" });
	return result; // return object, not JSON string
}

export async function getOwnedObjects(owner: string) {
	const result = await c().listOwnedObjects({ owner });
	return result; // return object
}

export async function getObjectDump(objectId: string) {
	const resp = await c().ledgerService.getObject({
		objectId, // note: your generated client might expect object_id; adapt naming
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
	if (!obj) return { objectId, rows: [{ name: "(error)", value: "object not found" }] };

	// Try to locate Move fields in common places. This depends on your Object proto.
	// Inspect obj in console once to confirm where it lives.
	const moveJson =
		(obj as any).content?.fields ??
		(obj as any).moveObject?.fields ??
		(obj as any).move_object?.fields ??
		(obj as any).data?.moveObject?.fields ??
		(obj as any).data?.move_object?.fields ??
		null;

	const rows: Array<{ name: string; value: string }> = [];

	// Always include basic metadata
	rows.push({ name: "object_id", value: (obj as any).objectId ?? (obj as any).object_id ?? objectId });
	if ((obj as any).type) rows.push({ name: "type", value: String((obj as any).type) });
	if ((obj as any).version != null) rows.push({ name: "version", value: String((obj as any).version) });
	if ((obj as any).digest) rows.push({ name: "digest", value: String((obj as any).digest) });
	if ((obj as any).owner) rows.push({ name: "owner", value: pretty((obj as any).owner) });

	if (moveJson && typeof moveJson === "object") {
		for (const [k, v] of Object.entries(moveJson)) {
			rows.push({ name: k, value: pretty(v) });
		}
	} else {
		// Last resort: dump the whole object so you can see the shape and adjust the selectors above
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

// -------------------- Wallet (sign + relay) --------------------

type Network = "testnet" | "devnet" | "mainnet" | "localnet";

function chainId(network: Network) {
	return `sui:${network}` as const;
}

type WalletList = ReturnType<ReturnType<typeof getWallets>["get"]>;
type Wallet = WalletList[number];

type CompatibleWallet = Wallet & {
	features: Wallet["features"] & {
		[StandardConnect]: StandardConnectFeature[typeof StandardConnect];
		[SuiSignTransaction]: SuiSignTransactionFeature[typeof SuiSignTransaction];
	};
};

function hasModernFeatures(wallet: Wallet): wallet is CompatibleWallet {
	return !!wallet.features[StandardConnect] && !!wallet.features[SuiSignTransaction];
}

//Eve Vault
//Slush for localnet
export function pickWallet(preferredName = "Slush"): Wallet {
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

export function debugWalletFeatures() {
	return getWallets().get().map((w) => ({
		name: w.name,
		features: Object.keys(w.features),
	}));
}

type TxArg =
	| { kind: 'pure'; value: string | number | boolean }
	| { kind: 'object'; objectId: string };

function makeClient(network: Network) {
	//for now needs to use SuiJsonRpcClient instead of SuiGrpcClient, as SuiGrpcClient doesn't provide getOwnedObjects
	return new SuiJsonRpcClient({
		network,
		url: `https://fullnode.${network}.sui.io:443`,
		//baseUrl: `https://fullnode.${network}.sui.io:443`,
	});
}

export async function findOwnedObjectIdByType(args: {
	network: Network;
	packageId: string;
	module: string;
	objectName: string;
}) {
	const wallet = pickWallet();

	const connectFeature =
		wallet.features[StandardConnect] as
		| StandardConnectFeature[typeof StandardConnect]
		| undefined;

	if (!connectFeature) {
		throw new Error("Wallet does not support standard:connect");
	}

	const result = await connectFeature.connect();
	const accounts = result.accounts;

	if (!accounts?.length) throw new Error('No accounts returned from wallet.');
	const account = accounts[0];

	const owner = accounts[0].address;
	const client = makeClient(args.network);

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

declare global {
	interface Window {
		walletInterop: {
			connectSuiLocalDev: () => Promise<string>;
			findOwnedObjectIdByType: (args: {
				network: Network;
				packageId: string;
				module: string;
				objectName: string;
			}) => Promise<string | null>;
			getOwnedObjects: (owner: string) => Promise<unknown>;
			getObjectDump: (objectId: string) => Promise<unknown>;
			getSuiBalance: (owner: string) => Promise<unknown>;
			debugWalletFeatures: () => Array<{ name: string; features: string[] }>;
		};
	}
}

window.walletInterop = {
	connectSuiLocalDev,
	findOwnedObjectIdByType,
	getOwnedObjects,
	getObjectDump,
	getSuiBalance,
	debugWalletFeatures,
};

export { };