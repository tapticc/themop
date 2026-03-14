module the_mop::compliance;

use the_mop::config::{Self, AdminCap, ExtensionConfig};

const EComplianceConfigNotFound: u64 = 0;

public struct ComplianceConfigKey has copy, drop, store {
    type_id: u64,
}

public struct ComplianceConfig has drop, store {
    cp_awarded: u64,
    essential_multiplier: u64,
}

public fun has_compliance_config(
    extension_config: &ExtensionConfig,
    type_id: u64,
): bool {
    config::has_rule<ComplianceConfigKey>(
        extension_config,
        ComplianceConfigKey { type_id },
    )
}

public fun borrow_compliance_config(
    extension_config: &ExtensionConfig,
    type_id: u64,
): &ComplianceConfig {
    assert!(
        has_compliance_config(extension_config, type_id),
        EComplianceConfigNotFound
    );

    config::borrow_rule<ComplianceConfigKey, ComplianceConfig>(
        extension_config,
        ComplianceConfigKey { type_id },
    )
}

public fun set_compliance_config(
    extension_config: &mut ExtensionConfig,
    admin_cap: &AdminCap,
    type_id: u64,
    cp_awarded: u64,
    essential_multiplier: u64,
) {
    config::set_rule<ComplianceConfigKey, ComplianceConfig>(
        extension_config,
        admin_cap,
        ComplianceConfigKey { type_id },
        ComplianceConfig {
            cp_awarded,
            essential_multiplier,
        },
    );
}

public fun remove_compliance_config(
    extension_config: &mut ExtensionConfig,
    admin_cap: &AdminCap,
    type_id: u64,
): ComplianceConfig {
    assert!(
        has_compliance_config(extension_config, type_id),
        EComplianceConfigNotFound
    );

    config::remove_rule<ComplianceConfigKey, ComplianceConfig>(
        extension_config,
        admin_cap,
        ComplianceConfigKey { type_id },
    )
}

public fun cp_awarded(
    extension_config: &ExtensionConfig,
    type_id: u64,
): u64 {
    borrow_compliance_config(extension_config, type_id).cp_awarded
}

public fun essential_multiplier(
    extension_config: &ExtensionConfig,
    type_id: u64,
): u64 {
    borrow_compliance_config(extension_config, type_id).essential_multiplier
}