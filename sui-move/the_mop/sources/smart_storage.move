module the_mop::smart_storage;

use sui::event;

use the_mop::config::AdminCap;
use the_mop::items::{Self as items, ItemConfigRegistry};
use the_mop::roles::{Self as roles, RoleCap};
use the_mop::points::{Self as points, PointsRegistry};

use world::access::OwnerCap;
use world::character::Character;
use world::inventory::Item;
use world::storage_unit::{
    StorageUnit,
    deposit_item,
    deposit_to_open_inventory,
    withdraw_from_open_inventory,
    withdraw_by_owner,
};

/// Witness type used when this extension has been authorized on a StorageUnit.
public struct SmartStorageAuth has drop {}

/// Shared extension registry / policy root.
public struct SmartStorageRegistry has key {
    id: UID,
    linked_item_registry_id: Option<ID>,
    linked_points_registry_id: Option<ID>,
    allow_high_executor_approval: bool,
    allow_treasury_officer_approval: bool,
    allow_logistics_operative_approval: bool,
}

/// Event: item moved from open inventory into main inventory.
public struct ItemMovedToMainEvent has copy, drop {
    item_id: u64,
    quantity: u32,
    moved_by: address,
}

/// Event: registry linked to item config registry.
public struct ItemRegistryLinkedEvent has copy, drop {
    item_registry_id: ID,
    updated_by: address,
}

/// Event: approval policy updated.
public struct ApprovalPolicyUpdatedEvent has copy, drop {
    allow_high_executor_approval: bool,
    allow_treasury_officer_approval: bool,
    allow_logistics_operative_approval: bool,
    updated_by: address,
}

public struct PlayerDepositItemEvent has copy, drop {
    storage_unit_id: ID,
    character_id: ID,
    character_address: address,
    item_id: u64,
    quantity: u32,
    points_awarded: u64,
    moved_by: address,
}

public struct PlayerDepositBatchEvent has copy, drop {
    storage_unit_id: ID,
    character_id: ID,
    character_address: address,
    item_count: u64,
    total_quantity: u64,
    total_points_awarded: u64,
    moved_by: address,
}

public struct PointsRegistryLinkedEvent has copy, drop {
    points_registry_id: ID,
    updated_by: address,
}

// === Errors ===

const EVectorLengthMismatch: u64 = 0;
const EItemRegistryNotLinked: u64 = 1;
const EItemRegistryMismatch: u64 = 2;
const ENotAuthorizedForApproval: u64 = 3;
const EZeroQuantity: u64 = 4;
const EPointsRegistryNotLinked: u64 = 5;
const EPointsRegistryMismatch: u64 = 6;

// === Init ===

fun init(ctx: &mut TxContext) {
    let registry = SmartStorageRegistry {
        id: object::new(ctx),
        linked_item_registry_id: option::none(),
        linked_points_registry_id: option::none(),
        allow_high_executor_approval: true,
        allow_treasury_officer_approval: true,
        allow_logistics_operative_approval: false,
    };

    transfer::share_object(registry);
}

// === Internal helpers ===

fun assert_same_length(item_ids: &vector<u64>, quantities: &vector<u32>) {
    assert!(
        vector::length(item_ids) == vector::length(quantities),
        EVectorLengthMismatch
    );
}

fun assert_points_registry_linked(
    registry: &SmartStorageRegistry,
    points_registry: &PointsRegistry,
) {
    assert!(option::is_some(&registry.linked_points_registry_id), EPointsRegistryNotLinked);

    let linked_id_ref = option::borrow(&registry.linked_points_registry_id);
    assert!(*linked_id_ref == object::id(points_registry), EPointsRegistryMismatch);
}

fun assert_nonzero_quantity(quantity: u32) {
    assert!(quantity > 0, EZeroQuantity);
}

fun assert_item_registry_linked(
    registry: &SmartStorageRegistry,
    item_registry: &ItemConfigRegistry,
) {
    assert!(option::is_some(&registry.linked_item_registry_id), EItemRegistryNotLinked);

    let linked_id_ref = option::borrow(&registry.linked_item_registry_id);
    assert!(*linked_id_ref == object::id(item_registry), EItemRegistryMismatch);
}

/// Intake eligibility:
/// - item must exist in item config registry
/// - item must be enabled
fun is_item_intake_eligible(
    item_registry: &ItemConfigRegistry,
    item_id: u64,
): bool {
    if (!items::has_item_config(item_registry, item_id)) {
        return false
    };

    let cfg = items::borrow_item_config(item_registry, item_id);
    items::is_enabled(cfg)
}

/// Approval eligibility:
/// - item must still exist in item config registry
/// - does NOT require enabled=true, so already-staged stock can still be settled
fun is_item_approval_eligible(
    item_registry: &ItemConfigRegistry,
    item_id: u64,
): bool {
    items::has_item_config(item_registry, item_id)
}

fun can_manage_open_to_main(
    registry: &SmartStorageRegistry,
    role_cap: &RoleCap,
): bool {
    let role = roles::role_id(role_cap);

    (registry.allow_high_executor_approval && role == roles::role_high_executor()) ||
    (registry.allow_treasury_officer_approval && role == roles::role_treasury_officer()) ||
    (registry.allow_logistics_operative_approval && role == roles::role_logistics_operative())
}

// === Admin config ===

public fun link_item_registry_as_admin(
    registry: &mut SmartStorageRegistry,
    _: &AdminCap,
    item_registry: &ItemConfigRegistry,
    ctx: &TxContext,
) {
    registry.linked_item_registry_id = option::some(object::id(item_registry));

    event::emit(ItemRegistryLinkedEvent {
        item_registry_id: object::id(item_registry),
        updated_by: ctx.sender(),
    });
}

public fun link_points_registry_as_admin(
    registry: &mut SmartStorageRegistry,
    _: &AdminCap,
    points_registry: &PointsRegistry,
    ctx: &TxContext,
) {
    registry.linked_points_registry_id = option::some(object::id(points_registry));

    event::emit(PointsRegistryLinkedEvent {
        points_registry_id: object::id(points_registry),
        updated_by: ctx.sender(),
    });
}

public fun set_approval_policy_as_admin(
    registry: &mut SmartStorageRegistry,
    _: &AdminCap,
    allow_high_executor_approval: bool,
    allow_treasury_officer_approval: bool,
    allow_logistics_operative_approval: bool,
    ctx: &TxContext,
) {
    registry.allow_high_executor_approval = allow_high_executor_approval;
    registry.allow_treasury_officer_approval = allow_treasury_officer_approval;
    registry.allow_logistics_operative_approval = allow_logistics_operative_approval;

    event::emit(ApprovalPolicyUpdatedEvent {
        allow_high_executor_approval,
        allow_treasury_officer_approval,
        allow_logistics_operative_approval,
        updated_by: ctx.sender(),
    });
}

// === Intake path: player-owned inventory -> open inventory ===

/// Moves only configured + enabled items from the player's owned inventory into open inventory.
/// Unconfigured or disabled item_ids are skipped and left untouched.
///
/// The caller must be the character wallet because `withdraw_by_owner<Character>` requires
/// `character.character_address() == ctx.sender()`.
public fun move_configured_player_items_to_open(
    registry: &SmartStorageRegistry,
    item_registry: &ItemConfigRegistry,
    points_registry: &mut PointsRegistry,
    storage_unit: &mut StorageUnit,
    character: &Character,
    owner_cap: &OwnerCap<Character>,
    item_ids: vector<u64>,
    quantities: vector<u32>,
    ctx: &mut TxContext,
) {
    assert_same_length(&item_ids, &quantities);
    assert_item_registry_linked(registry, item_registry);
    assert_points_registry_linked(registry, points_registry);

    let storage_unit_id = object::id(storage_unit);
    let character_id = object::id(character);

    let mut i = 0;
    let len = vector::length(&item_ids);

    let mut moved_item_count: u64 = 0;
    let mut moved_total_quantity: u64 = 0;
    let mut moved_total_points: u64 = 0;

    while (i < len) {
        let item_id = *vector::borrow(&item_ids, i);
        let quantity = *vector::borrow(&quantities, i);

        assert_nonzero_quantity(quantity);

        if (is_item_intake_eligible(item_registry, item_id)) {
            let item: Item = withdraw_by_owner<Character>(
                storage_unit,
                character,
                owner_cap,
                item_id,
                quantity,
                ctx,
            );

            deposit_to_open_inventory<SmartStorageAuth>(
                storage_unit,
                character,
                item,
                SmartStorageAuth {},
                ctx,
            );

            let cfg = items::borrow_item_config(item_registry, item_id);
            let points_awarded =
                items::compliance_points(cfg) *
                items::essential_multiplier(cfg) *
                (quantity as u64);

            points::award_points(
                points_registry,
                character.character_address(),
                points_awarded,
                ctx.sender(),
            );
            
            event::emit(PlayerDepositItemEvent {
                storage_unit_id,
                character_id,
                character_address: character.character_address(),
                item_id,
                quantity,
                points_awarded,
                moved_by: ctx.sender(),
            });

            moved_item_count = moved_item_count + 1;
            moved_total_quantity = moved_total_quantity + (quantity as u64);
            moved_total_points = moved_total_points + points_awarded;
        };

        i = i + 1;
    };

    if (moved_item_count > 0) {
        event::emit(PlayerDepositBatchEvent {
            storage_unit_id,
            character_id,
            character_address: character.character_address(),
            item_count: moved_item_count,
            total_quantity: moved_total_quantity,
            total_points_awarded: moved_total_points,
            moved_by: ctx.sender(),
        });
    };
}

// === Approval path: open inventory -> main inventory ===

/// Moves configured items from open inventory into the storage unit's main inventory.
/// Requires an allowed role manager.
/// Unconfigured item_ids are skipped and left untouched.
public fun move_open_items_to_main(
    registry: &SmartStorageRegistry,
    item_registry: &ItemConfigRegistry,
    role_cap: &RoleCap,
    storage_unit: &mut StorageUnit,
    character: &Character,
    item_ids: vector<u64>,
    quantities: vector<u32>,
    ctx: &mut TxContext,
) {
    assert_same_length(&item_ids, &quantities);
    assert_item_registry_linked(registry, item_registry);
    assert!(can_manage_open_to_main(registry, role_cap), ENotAuthorizedForApproval);

    let mut i = 0;
    let len = vector::length(&item_ids);

    while (i < len) {
        let item_id = *vector::borrow(&item_ids, i);
        let quantity = *vector::borrow(&quantities, i);

        assert_nonzero_quantity(quantity);

        if (is_item_approval_eligible(item_registry, item_id)) {
            let item: Item = withdraw_from_open_inventory<SmartStorageAuth>(
                storage_unit,
                character,
                SmartStorageAuth {},
                item_id,
                quantity,
                ctx,
            );

            deposit_item<SmartStorageAuth>(
                storage_unit,
                character,
                item,
                SmartStorageAuth {},
                ctx,
            );

            event::emit(ItemMovedToMainEvent {
                item_id,
                quantity,
                moved_by: ctx.sender(),
            });
        };

        i = i + 1;
    };
}

// === Read helpers ===

public fun is_item_registry_linked(registry: &SmartStorageRegistry): bool {
    option::is_some(&registry.linked_item_registry_id)
}

public fun linked_item_registry_id(registry: &SmartStorageRegistry): ID {
    *option::borrow(&registry.linked_item_registry_id)
}

public fun can_role_manage_open_to_main(
    registry: &SmartStorageRegistry,
    role_cap: &RoleCap,
): bool {
    can_manage_open_to_main(registry, role_cap)
}
