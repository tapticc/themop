// -------------------- Roles --------------------
// These should mirror the role IDs defined in the Move code (e.g. in roles.move)
export const Roles = {
	HIGH_EXECUTOR: 1,
	COMPLIANCE_OFFICER: 2,
	LOGISTICS_OPERATIVE: 3,
	RECON_OPERATIVE: 4,
	TREASURY_OFFICER: 5,
	REGISTERED_CITIZEN: 6,
} as const;

export const RoleNames: Record<number, string> = {
	1: "High Executor",
	2: "Compliance Officer",
	3: "Logistics Operative",
	4: "Recon Operative",
	5: "Treasury Officer",
	6: "Registered Citizen",
};

export const AssignableRoles = [
	Roles.COMPLIANCE_OFFICER,
	Roles.LOGISTICS_OPERATIVE,
	Roles.RECON_OPERATIVE,
	Roles.TREASURY_OFFICER,
	Roles.REGISTERED_CITIZEN,
];

export type RoleId = typeof Roles[keyof typeof Roles];