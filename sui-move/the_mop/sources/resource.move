module the_mop::resources;

use std::string::String;
use the_mop::config::{Self, AdminCap, ExtensionConfig};

const EResourceConfigNotFound: u64 = 0;

public struct ResourceConfigKey has copy, drop, store {
    type_id: u64,
}

public struct ResourceConfig has drop, store {
    item_id: u64,
    label: String,
    enabled: bool,
}

public fun has_resource_config(
    extension_config: &ExtensionConfig,
    type_id: u64,
): bool {
    config::has_rule<ResourceConfigKey>(
        extension_config,
        ResourceConfigKey { type_id },
    )
}

public fun borrow_resource_config(
    extension_config: &ExtensionConfig,
    type_id: u64,
): &ResourceConfig {
    assert!(
        has_resource_config(extension_config, type_id),
        EResourceConfigNotFound
    );

    config::borrow_rule<ResourceConfigKey, ResourceConfig>(
        extension_config,
        ResourceConfigKey { type_id },
    )
}

public fun set_resource_config(
    extension_config: &mut ExtensionConfig,
    admin_cap: &AdminCap,
    type_id: u64,
    item_id: u64,
    label: String,
    enabled: bool,
) {
    config::set_rule<ResourceConfigKey, ResourceConfig>(
        extension_config,
        admin_cap,
        ResourceConfigKey { type_id },
        ResourceConfig {
            item_id,
            label,
            enabled,
        },
    );
}

public fun remove_resource_config(
    extension_config: &mut ExtensionConfig,
    admin_cap: &AdminCap,
    type_id: u64,
): ResourceConfig {
    assert!(
        has_resource_config(extension_config, type_id),
        EResourceConfigNotFound
    );

    config::remove_rule<ResourceConfigKey, ResourceConfig>(
        extension_config,
        admin_cap,
        ResourceConfigKey { type_id },
    )
}

public fun item_id(
    extension_config: &ExtensionConfig,
    type_id: u64,
): u64 {
    borrow_resource_config(extension_config, type_id).item_id
}

public fun label(
    extension_config: &ExtensionConfig,
    type_id: u64,
): &String {
    &borrow_resource_config(extension_config, type_id).label
}

public fun enabled(
    extension_config: &ExtensionConfig,
    type_id: u64,
): bool {
    borrow_resource_config(extension_config, type_id).enabled
}