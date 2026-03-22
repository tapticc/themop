module the_mop::points;

use sui::dynamic_field as df;
use sui::event;

public struct PointsRegistry has key {
    id: UID,
}

public struct PlayerPointsKey has copy, drop, store {
    character_address: address,
}

public struct PlayerPoints has store, drop {
    compliance_points: u64,
    ministry_points: u64,
}

public struct PointsAwardedEvent has copy, drop {
    character_address: address,
    compliance_points_added: u64,
    ministry_points_added: u64,
    awarded_by: address,
}

public struct CompliancePointsSpentEvent has copy, drop {
    character_address: address,
    amount: u64,
    spent_by: address,
}

const EPlayerPointsNotFound: u64 = 0;
const EInsufficientCompliancePoints: u64 = 1;
const EZeroAmount: u64 = 2;

fun init(ctx: &mut TxContext) {
    let registry = PointsRegistry {
        id: object::new(ctx),
    };

    transfer::share_object(registry);
}

fun player_key(character_address: address): PlayerPointsKey {
    PlayerPointsKey { character_address }
}

fun ensure_player_points(
    registry: &mut PointsRegistry,
    character_address: address,
) {
    let key = player_key(character_address);

    if (!df::exists_(&registry.id, copy key)) {
        df::add(
            &mut registry.id,
            key,
            PlayerPoints {
                compliance_points: 0,
                ministry_points: 0,
            }
        );
    };
}

public fun award_points(
    registry: &mut PointsRegistry,
    character_address: address,
    amount: u64,
    awarded_by: address,
) {
    assert!(amount > 0, EZeroAmount);

    ensure_player_points(registry, character_address);

    let points = df::borrow_mut<PlayerPointsKey, PlayerPoints>(
        &mut registry.id,
        player_key(character_address)
    );

    points.compliance_points = points.compliance_points + amount;
    points.ministry_points = points.ministry_points + amount;

    event::emit(PointsAwardedEvent {
        character_address,
        compliance_points_added: amount,
        ministry_points_added: amount,
        awarded_by,
    });
}

public fun spend_compliance_points(
    registry: &mut PointsRegistry,
    character_address: address,
    amount: u64,
    spent_by: address,
) {
    assert!(amount > 0, EZeroAmount);
    assert!(has_player_points(registry, character_address), EPlayerPointsNotFound);

    let points = df::borrow_mut<PlayerPointsKey, PlayerPoints>(
        &mut registry.id,
        player_key(character_address)
    );

    assert!(points.compliance_points >= amount, EInsufficientCompliancePoints);

    points.compliance_points = points.compliance_points - amount;

    event::emit(CompliancePointsSpentEvent {
        character_address,
        amount,
        spent_by,
    });
}

public fun has_player_points(
    registry: &PointsRegistry,
    character_address: address,
): bool {
    df::exists_(&registry.id, player_key(character_address))
}

public fun compliance_points(
    registry: &PointsRegistry,
    character_address: address,
): u64 {
    assert!(has_player_points(registry, character_address), EPlayerPointsNotFound);

    let points = df::borrow<PlayerPointsKey, PlayerPoints>(
        &registry.id,
        player_key(character_address)
    );

    points.compliance_points
}

public fun ministry_points(
    registry: &PointsRegistry,
    character_address: address,
): u64 {
    assert!(has_player_points(registry, character_address), EPlayerPointsNotFound);

    let points = df::borrow<PlayerPointsKey, PlayerPoints>(
        &registry.id,
        player_key(character_address)
    );

    points.ministry_points
}

public fun borrow_player_points(
    registry: &PointsRegistry,
    character_address: address,
): &PlayerPoints {
    assert!(has_player_points(registry, character_address), EPlayerPointsNotFound);

    df::borrow<PlayerPointsKey, PlayerPoints>(
        &registry.id,
        player_key(character_address)
    )
}
