module the_mop::gate_permits;

use sui::event;
use world::{
    character::Character,
    gate::{Self as gate, Gate},
};
use the_mop::{
    config::AdminCap,
    gate_config::GateAuth,
    points::{Self as points, PointsRegistry},
};

public struct GatePermitRegistry has key {
    id: UID,
    linked_points_registry_id: Option<ID>,
    permit_cost_compliance_points: u64,
}

public struct GatePermitRegistryLinkedEvent has copy, drop {
    points_registry_id: ID,
    updated_by: address,
}

public struct PermitCostUpdatedEvent has copy, drop {
    permit_cost_compliance_points: u64,
    updated_by: address,
}

public struct JumpPermitPurchasedEvent has copy, drop {
    gate_id: ID,
    destination_gate_id: ID,
    character_id: ID,
    character_address: address,
    compliance_points_spent: u64,
    expires_at_timestamp_ms: u64,
    purchased_by: address,
}

const EPointsRegistryNotLinked: u64 = 0;
const EPointsRegistryMismatch: u64 = 1;
const EZeroPermitCost: u64 = 2;

fun init(ctx: &mut TxContext) {
    let registry = GatePermitRegistry {
        id: object::new(ctx),
        linked_points_registry_id: option::none(),
        permit_cost_compliance_points: 1,
    };

    transfer::share_object(registry);
}

fun assert_points_registry_linked(
    registry: &GatePermitRegistry,
    points_registry: &PointsRegistry,
) {
    assert!(option::is_some(&registry.linked_points_registry_id), EPointsRegistryNotLinked);

    let linked_id = option::borrow(&registry.linked_points_registry_id);
    assert!(*linked_id == object::id(points_registry), EPointsRegistryMismatch);
}

public fun link_points_registry_as_admin(
    registry: &mut GatePermitRegistry,
    _: &AdminCap,
    points_registry: &PointsRegistry,
    ctx: &TxContext,
) {
    registry.linked_points_registry_id = option::some(object::id(points_registry));

    event::emit(GatePermitRegistryLinkedEvent {
        points_registry_id: object::id(points_registry),
        updated_by: ctx.sender(),
    });
}

public fun set_permit_cost_as_admin(
    registry: &mut GatePermitRegistry,
    _: &AdminCap,
    permit_cost_compliance_points: u64,
    ctx: &TxContext,
) {
    assert!(permit_cost_compliance_points > 0, EZeroPermitCost);

    registry.permit_cost_compliance_points = permit_cost_compliance_points;

    event::emit(PermitCostUpdatedEvent {
        permit_cost_compliance_points,
        updated_by: ctx.sender(),
    });
}

public fun permit_cost_compliance_points(registry: &GatePermitRegistry): u64 {
    registry.permit_cost_compliance_points
}

public fun purchase_jump_permit(
    registry: &GatePermitRegistry,
    points_registry: &mut PointsRegistry,
    source_gate: &Gate,
    destination_gate: &Gate,
    character: &Character,
    expires_at_timestamp_ms: u64,
    ctx: &mut TxContext,
) {
    assert_points_registry_linked(registry, points_registry);

    let cost = registry.permit_cost_compliance_points;
    let character_address = character.character_address();
    let character_id = object::id(character);

    points::spend_compliance_points(
        points_registry,
        character_address,
        cost,
        ctx.sender(),
    );

    gate::issue_jump_permit<GateAuth>(
        source_gate,
        destination_gate,
        character,
        the_mop::gate_config::gate_auth(),
        expires_at_timestamp_ms,
        ctx,
    );

    event::emit(JumpPermitPurchasedEvent {
        gate_id: object::id(source_gate),
        destination_gate_id: object::id(destination_gate),
        character_id,
        character_address,
        compliance_points_spent: cost,
        expires_at_timestamp_ms,
        purchased_by: ctx.sender(),
    });
}