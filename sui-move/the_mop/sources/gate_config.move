module the_mop::gate_config;

/// Witness type used to authorize the Ministry gate extension on `world::gate::Gate`.
public struct GateAuth has drop {}

public(package) fun gate_auth(): GateAuth {
    GateAuth {}
}