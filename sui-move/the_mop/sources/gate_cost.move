module the_mop::gate_costs;

use the_mop::config::{Self, AdminCap, ExtensionConfig};

const EGateCostConfigNotFound: u64 = 0;

public struct GateCostConfigKey has copy, drop, store {}

public struct GateCostConfig has drop, store {
    local_jump_cp: u64,
    regional_jump_cp: u64,
    long_range_jump_cp: u64,
}

public fun has_gate_cost_config(
    extension_config: &ExtensionConfig,
): bool {
    config::has_rule<GateCostConfigKey>(
        extension_config,
        GateCostConfigKey {},
    )
}

public fun borrow_gate_cost_config(
    extension_config: &ExtensionConfig,
): &GateCostConfig {
    assert!(
        has_gate_cost_config(extension_config),
        EGateCostConfigNotFound
    );

    config::borrow_rule<GateCostConfigKey, GateCostConfig>(
        extension_config,
        GateCostConfigKey {},
    )
}

public fun set_gate_cost_config(
    extension_config: &mut ExtensionConfig,
    admin_cap: &AdminCap,
    local_jump_cp: u64,
    regional_jump_cp: u64,
    long_range_jump_cp: u64,
) {
    config::set_rule<GateCostConfigKey, GateCostConfig>(
        extension_config,
        admin_cap,
        GateCostConfigKey {},
        GateCostConfig {
            local_jump_cp,
            regional_jump_cp,
            long_range_jump_cp,
        },
    );
}

public fun remove_gate_cost_config(
    extension_config: &mut ExtensionConfig,
    admin_cap: &AdminCap,
): GateCostConfig {
    assert!(
        has_gate_cost_config(extension_config),
        EGateCostConfigNotFound
    );

    config::remove_rule<GateCostConfigKey, GateCostConfig>(
        extension_config,
        admin_cap,
        GateCostConfigKey {},
    )
}

public fun local_jump_cp(
    extension_config: &ExtensionConfig,
): u64 {
    borrow_gate_cost_config(extension_config).local_jump_cp
}

public fun regional_jump_cp(
    extension_config: &ExtensionConfig,
): u64 {
    borrow_gate_cost_config(extension_config).regional_jump_cp
}

public fun long_range_jump_cp(
    extension_config: &ExtensionConfig,
): u64 {
    borrow_gate_cost_config(extension_config).long_range_jump_cp
}