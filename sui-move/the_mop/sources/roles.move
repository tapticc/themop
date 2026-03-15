module the_mop::roles;

use sui::dynamic_field as df;
use sui::event;

/// Root shared registry for role assignments.
public struct RoleRegistry has key {
    id: UID,
}

/// Root authority for assigning and revoking roles.
public struct RoleAdminCap has key, store {
    id: UID,
}

/// A granted role owned by a wallet address.
public struct RoleCap has key, store {
    id: UID,
    role_id: u8,
    grantee: address,
    granted_by: address,
}

/// Uniqueness marker: one role per address per role_id.
public struct RoleAssignmentKey has copy, drop, store {
    grantee: address,
    role_id: u8,
}

/// Stores the current RoleCap object id for a unique assignment.
public struct RoleAssignment has store, drop {
    role_cap_id: ID,
}

/// Event emitted when a role is granted.
public struct RoleGrantedEvent has copy, drop {
    role_cap_id: ID,
    role_id: u8,
    grantee: address,
    granted_by: address,
}

/// Event emitted when a role is revoked.
public struct RoleRevokedEvent has copy, drop {
    role_cap_id: ID,
    role_id: u8,
    grantee: address,
    revoked_by: address,
}

// === Role IDs ===
const ROLE_HIGH_EXECUTOR: u8 = 1;
const ROLE_COMPLIANCE_OFFICER: u8 = 2;
const ROLE_LOGISTICS_OPERATIVE: u8 = 3;
const ROLE_RECON_OPERATIVE: u8 = 4;
const ROLE_TREASURY_OFFICER: u8 = 5;
const ROLE_REGISTERED_CITIZEN: u8 = 6;

// === Errors ===
const ERoleAlreadyAssigned: u64 = 0;
const ERoleAssignmentNotFound: u64 = 1;
const EInvalidRoleId: u64 = 2;
const ERoleCapMismatch: u64 = 3;
const ENotHighExecutor: u64 = 4;
const ERoleNotManageableByHighExecutor: u64 = 5;

// === Init ===

fun init(ctx: &mut TxContext) {
    let admin_cap = RoleAdminCap {
        id: object::new(ctx),
    };
    transfer::transfer(admin_cap, ctx.sender());

    let registry = RoleRegistry {
        id: object::new(ctx),
    };
    transfer::share_object(registry);
}

// === Internal helpers ===

fun is_valid_role(role_id: u8): bool {
    role_id == ROLE_HIGH_EXECUTOR ||
    role_id == ROLE_COMPLIANCE_OFFICER ||
    role_id == ROLE_LOGISTICS_OPERATIVE ||
    role_id == ROLE_RECON_OPERATIVE ||
    role_id == ROLE_TREASURY_OFFICER ||
    role_id == ROLE_REGISTERED_CITIZEN
}

fun assignment_key(grantee: address, role_id: u8): RoleAssignmentKey {
    RoleAssignmentKey { grantee, role_id }
}

fun is_high_executor_role(role_id: u8): bool {
    role_id == ROLE_HIGH_EXECUTOR
}

fun can_high_executor_manage(role_id: u8): bool {
    role_id == ROLE_COMPLIANCE_OFFICER ||
    role_id == ROLE_LOGISTICS_OPERATIVE ||
    role_id == ROLE_RECON_OPERATIVE ||
    role_id == ROLE_TREASURY_OFFICER ||
    role_id == ROLE_REGISTERED_CITIZEN
}

fun grant_role_internal(
    registry: &mut RoleRegistry,
    role_id: u8,
    grantee: address,
    granted_by: address,
    ctx: &mut TxContext,
) {
    assert!(is_valid_role(role_id), EInvalidRoleId);

    let key = assignment_key(grantee, role_id);
    assert!(!df::exists_(&registry.id, copy key), ERoleAlreadyAssigned);

    let role_cap = RoleCap {
        id: object::new(ctx),
        role_id,
        grantee,
        granted_by,
    };

    let role_cap_id = object::id(&role_cap);

    df::add(
        &mut registry.id,
        key,
        RoleAssignment { role_cap_id }
    );

    event::emit(RoleGrantedEvent {
        role_cap_id,
        role_id,
        grantee,
        granted_by,
    });

    transfer::transfer(role_cap, grantee);
}

fun revoke_role_internal(
    registry: &mut RoleRegistry,
    role_cap: RoleCap,
    revoked_by: address,
) {
    let RoleCap {
        id,
        role_id,
        grantee,
        granted_by: _,
    } = role_cap;

    assert!(is_valid_role(role_id), EInvalidRoleId);

    let key = assignment_key(grantee, role_id);
    assert!(df::exists_(&registry.id, copy key), ERoleAssignmentNotFound);

    let assignment = df::remove<RoleAssignmentKey, RoleAssignment>(&mut registry.id, key);

    let role_cap_id = object::uid_to_inner(&id);
    assert!(assignment.role_cap_id == role_cap_id, ERoleCapMismatch);

    event::emit(RoleRevokedEvent {
        role_cap_id,
        role_id,
        grantee,
        revoked_by,
    });

    id.delete();
}

// === Public role management ===

/// Root authority can grant any role, including High Executor.
public fun grant_role_as_admin(
    registry: &mut RoleRegistry,
    _: &RoleAdminCap,
    role_id: u8,
    grantee: address,
    ctx: &mut TxContext,
) {
    grant_role_internal(
        registry,
        role_id,
        grantee,
        ctx.sender(),
        ctx,
    );
}

/// High Executors can grant lower roles only.
public fun grant_role_as_high_executor(
    registry: &mut RoleRegistry,
    high_executor_cap: &RoleCap,
    role_id: u8,
    grantee: address,
    ctx: &mut TxContext,
) {
    assert!(is_high_executor_role(high_executor_cap.role_id), ENotHighExecutor);
    assert!(can_high_executor_manage(role_id), ERoleNotManageableByHighExecutor);

    grant_role_internal(
        registry,
        role_id,
        grantee,
        ctx.sender(),
        ctx,
    );
}

/// Root authority can revoke any role, including High Executor.
public fun revoke_role_as_admin(
    registry: &mut RoleRegistry,
    _: &RoleAdminCap,
    role_cap: RoleCap,
    ctx: &TxContext,
) {
    revoke_role_internal(
        registry,
        role_cap,
        ctx.sender(),
    );
}

/// High Executors can revoke lower roles only.
public fun revoke_role_as_high_executor(
    registry: &mut RoleRegistry,
    high_executor_cap: &RoleCap,
    role_cap: RoleCap,
    ctx: &TxContext,
) {
    assert!(is_high_executor_role(high_executor_cap.role_id), ENotHighExecutor);
    assert!(can_high_executor_manage(role_cap.role_id), ERoleNotManageableByHighExecutor);

    revoke_role_internal(
        registry,
        role_cap,
        ctx.sender(),
    );
}

// === Read helpers ===

public fun has_role(
    registry: &RoleRegistry,
    grantee: address,
    role_id: u8,
): bool {
    df::exists_(
        &registry.id,
        RoleAssignmentKey { grantee, role_id }
    )
}

public fun role_cap_id(
    registry: &RoleRegistry,
    grantee: address,
    role_id: u8,
): ID {
    assert!(has_role(registry, grantee, role_id), ERoleAssignmentNotFound);

    let assignment = df::borrow<RoleAssignmentKey, RoleAssignment>(
        &registry.id,
        RoleAssignmentKey { grantee, role_id }
    );

    assignment.role_cap_id
}

// === RoleCap getters ===

public fun role_id(role_cap: &RoleCap): u8 {
    role_cap.role_id
}

public fun grantee(role_cap: &RoleCap): address {
    role_cap.grantee
}

public fun granted_by(role_cap: &RoleCap): address {
    role_cap.granted_by
}

public fun role_high_executor(): u8 {
    ROLE_HIGH_EXECUTOR
}

public fun role_compliance_officer(): u8 {
    ROLE_COMPLIANCE_OFFICER
}

public fun role_logistics_operative(): u8 {
    ROLE_LOGISTICS_OPERATIVE
}

public fun role_recon_operative(): u8 {
    ROLE_RECON_OPERATIVE
}

public fun role_treasury_officer(): u8 {
    ROLE_TREASURY_OFFICER
}

public fun role_registered_citizen(): u8 {
    ROLE_REGISTERED_CITIZEN
}

// === Convenience checks ===

public fun is_high_executor(role_cap: &RoleCap): bool {
    is_high_executor_role(role_cap.role_id)
}

public fun is_compliance_officer(role_cap: &RoleCap): bool {
    role_cap.role_id == ROLE_COMPLIANCE_OFFICER
}

public fun is_logistics_operative(role_cap: &RoleCap): bool {
    role_cap.role_id == ROLE_LOGISTICS_OPERATIVE
}

public fun is_recon_operative(role_cap: &RoleCap): bool {
    role_cap.role_id == ROLE_RECON_OPERATIVE
}

public fun is_treasury_officer(role_cap: &RoleCap): bool {
    role_cap.role_id == ROLE_TREASURY_OFFICER
}

public fun is_registered_citizen(role_cap: &RoleCap): bool {
    role_cap.role_id == ROLE_REGISTERED_CITIZEN
}
