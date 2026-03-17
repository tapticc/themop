module the_mop::items;

use std::string::String;
use sui::dynamic_field as df;
use sui::event;

use the_mop::config::AdminCap;
use the_mop::roles::{RoleCap, role_id};

/// Shared root registry for item configuration.
public struct ItemConfigRegistry has key {
    id: UID,
}

/// Dynamic-field key.
public struct ItemConfigKey has copy, drop, store {
    item_id: u64,
}

/// Per-item configuration.
public struct ItemConfig has store, drop {
    item_id: u64,
    display_name: String,
    compliance_points: u64,
    essential_multiplier: u64,
    is_enabled: bool,
}

/// Event emitted when config is set.
public struct ItemConfigSetEvent has copy, drop {
    item_id: u64,
    compliance_points: u64,
    essential_multiplier: u64,
    is_enabled: bool,
    updated_by: address,
}

/// Event emitted when config is removed.
public struct ItemConfigRemovedEvent has copy, drop {
    item_id: u64,
    removed_by: address,
}

// === Role IDs (must match roles.move) ===

const ROLE_HIGH_EXECUTOR: u8 = 1;
const ROLE_TREASURY_OFFICER: u8 = 5;

// === Errors ===

const EItemConfigNotFound: u64 = 0;
const EInvalidEssentialMultiplier: u64 = 1;
const ENotAuthorizedForItemConfig: u64 = 2;

// === Init ===

fun init(ctx: &mut TxContext) {
    let registry = ItemConfigRegistry {
        id: object::new(ctx),
    };

    transfer::share_object(registry);
}

// === Internal helpers ===

fun item_key(item_id: u64): ItemConfigKey {
    ItemConfigKey { item_id }
}

fun can_manage_item_config(role_id: u8): bool {
    role_id == ROLE_HIGH_EXECUTOR ||
    role_id == ROLE_TREASURY_OFFICER
}

fun set_item_config_internal(
    registry: &mut ItemConfigRegistry,
    item_id: u64,
    display_name: String,
    compliance_points: u64,
    essential_multiplier: u64,
    is_enabled: bool,
    updated_by: address,
) {
    assert!(essential_multiplier > 0, EInvalidEssentialMultiplier);

    let key = item_key(item_id);

    if (df::exists_(&registry.id, copy key)) {
        let _old_config = df::remove<ItemConfigKey, ItemConfig>(&mut registry.id, copy key);
    };

    df::add(
        &mut registry.id,
        key,
        ItemConfig {
            item_id,
            display_name,
            compliance_points,
            essential_multiplier,
            is_enabled,
        }
    );

    event::emit(ItemConfigSetEvent {
        item_id,
        compliance_points,
        essential_multiplier,
        is_enabled,
        updated_by,
    });
}

// === Public role-managed functions ===

public fun set_item_config_as_role_manager(
    registry: &mut ItemConfigRegistry,
    role_cap: &RoleCap,
    item_id: u64,
    display_name: String,
    compliance_points: u64,
    essential_multiplier: u64,
    is_enabled: bool,
    ctx: &mut TxContext,
) {
    assert!(
        can_manage_item_config(role_id(role_cap)),
        ENotAuthorizedForItemConfig
    );

    set_item_config_internal(
        registry,
        item_id,
        display_name,
        compliance_points,
        essential_multiplier,
        is_enabled,
        ctx.sender(),
    );
}

public fun remove_item_config_as_role_manager(
    registry: &mut ItemConfigRegistry,
    role_cap: &RoleCap,
    item_id: u64,
    ctx: &TxContext,
) {
    assert!(
        can_manage_item_config(role_id(role_cap)),
        ENotAuthorizedForItemConfig
    );

    let key = item_key(item_id);

    assert!(
        df::exists_(&registry.id, copy key),
        EItemConfigNotFound
    );

    let removed = df::remove<ItemConfigKey, ItemConfig>(
        &mut registry.id,
        key
    );

    let ItemConfig {
        item_id: _,
        display_name: _,
        compliance_points: _,
        essential_multiplier: _,
        is_enabled: _,
    } = removed;

    event::emit(ItemConfigRemovedEvent {
        item_id,
        removed_by: ctx.sender(),
    });
}

// === Bootstrap admin fallback (optional safety) ===

public fun set_item_config_as_admin(
    registry: &mut ItemConfigRegistry,
    _: &AdminCap,
    item_id: u64,
    display_name: String,
    compliance_points: u64,
    essential_multiplier: u64,
    is_enabled: bool,
    ctx: &mut TxContext,
) {
    set_item_config_internal(
        registry,
        item_id,
        display_name,
        compliance_points,
        essential_multiplier,
        is_enabled,
        ctx.sender(),
    );
}

public fun remove_item_config_as_admin(
    registry: &mut ItemConfigRegistry,
    _: &AdminCap,
    item_id: u64,
    ctx: &TxContext,
) {
    let key = item_key(item_id);

    assert!(
        df::exists_(&registry.id, copy key),
        EItemConfigNotFound
    );

    let removed = df::remove<ItemConfigKey, ItemConfig>(
        &mut registry.id,
        key
    );

    let ItemConfig {
        item_id: _,
        display_name: _,
        compliance_points: _,
        essential_multiplier: _,
        is_enabled: _,
    } = removed;

    event::emit(ItemConfigRemovedEvent {
        item_id,
        removed_by: ctx.sender(),
    });
}

// === Read helpers ===

public fun is_item_config_manager(role_cap: &RoleCap): bool {
    can_manage_item_config(role_id(role_cap))
}

public fun is_enabled(config: &ItemConfig): bool {
    config.is_enabled
}

public fun has_item_config(
    registry: &ItemConfigRegistry,
    item_id: u64,
): bool {
    df::exists_(
        &registry.id,
        item_key(item_id)
    )
}

public fun borrow_item_config(
    registry: &ItemConfigRegistry,
    item_id: u64,
): &ItemConfig {
    assert!(
        has_item_config(registry, item_id),
        EItemConfigNotFound
    );

    df::borrow<ItemConfigKey, ItemConfig>(
        &registry.id,
        item_key(item_id)
    )
}
