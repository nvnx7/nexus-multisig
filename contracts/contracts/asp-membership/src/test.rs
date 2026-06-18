#![cfg(test)]

use super::*;
use soroban_sdk::{Address, Bytes, Env, U256, Vec, testutils::Address as _, vec};

/// Create a test environment that disables snapshot writing under Miri.
/// Miri's isolation mode blocks filesystem operations, which the Soroban SDK
/// uses for test snapshots.
fn test_env() -> Env {
    #[cfg(miri)]
    {
        use soroban_sdk::testutils::EnvTestConfig;
        Env::new_with_config(EnvTestConfig {
            capture_snapshot_at_drop: false,
        })
    }
    #[cfg(not(miri))]
    {
        Env::default()
    }
}

#[test]
fn test_init_valid() {
    let env = test_env();
    let admin = Address::generate(&env);
    env.register(ASPMembership, (admin, 3u32));
}

/// This test is skipped under Miri because the panic formatting path triggers
/// undefined behavior in the `ethnum` crate's unsafe formatting code.
/// See: https://github.com/nlordell/ethnum-rs/issues/34
#[test]
#[cfg_attr(miri, ignore)]
#[should_panic(expected = "Error(Contract, #3)")]
fn test_init_invalid_levels_zero() {
    let env = test_env();
    let admin = Address::generate(&env);
    env.register(ASPMembership, (admin, 0u32));
}

/// This test is skipped under Miri because the panic formatting path triggers
/// undefined behavior in the `ethnum` crate's unsafe formatting code.
/// See: https://github.com/nlordell/ethnum-rs/issues/34
#[test]
#[cfg_attr(miri, ignore)]
#[should_panic(expected = "Error(Contract, #3)")]
fn test_init_invalid_levels_too_large() {
    let env = test_env();
    let admin = Address::generate(&env);
    env.register(ASPMembership, (admin, 33u32));
}

#[test]
fn test_constructor_sets_admin_and_levels() {
    let env = test_env();
    let admin = Address::generate(&env);
    let levels = 3u32;
    let contract_id = env.register(ASPMembership, (admin.clone(), levels));

    let stored_admin: Address = env.as_contract(&contract_id, || {
        env.storage()
            .persistent()
            .get(&DataKey::Admin)
            .expect("Admin set in constructor")
    });
    let stored_levels: u32 = env.as_contract(&contract_id, || {
        env.storage()
            .persistent()
            .get(&DataKey::Levels)
            .expect("Levels set in constructor")
    });

    assert_eq!(stored_admin, admin);
    assert_eq!(stored_levels, levels);
}

#[test]
fn test_get_root() {
    let env = test_env();
    let admin = Address::generate(&env);
    let contract_id = env.register(ASPMembership, (admin.clone(), 3u32));
    let client = ASPMembershipClient::new(&env, &contract_id);

    // Get the initial root
    let initial_root = client.get_root();
    let zero = U256::from_u32(&env, 0u32);
    assert_ne!(initial_root, zero, "Initial root should not be zero"); // As we define zero in a different way

    // Verify initial root matches what's in storage
    let stored_root: U256 = env.as_contract(&contract_id, || {
        env.storage()
            .persistent()
            .get(&DataKey::Root)
            .expect("Root set in constructor")
    });
    assert_eq!(
        initial_root, stored_root,
        "get_root should match stored root"
    );

    // Insert a leaf and verify root changes
    env.mock_all_auths();
    let leaf = U256::from_u32(&env, 100u32);
    client.insert_leaf(&leaf);

    let new_root = client.get_root();
    assert_ne!(
        new_root, initial_root,
        "Root should change after inserting a leaf"
    );

    // Verify new root also matches storage
    let stored_new_root: U256 = env.as_contract(&contract_id, || {
        env.storage()
            .persistent()
            .get(&DataKey::Root)
            .expect("Root set after insert")
    });
    assert_eq!(
        new_root, stored_new_root,
        "get_root should match updated stored root"
    );
}

#[test]
fn test_hash_pair() {
    let env = test_env();
    let admin = Address::generate(&env);
    let contract_id = env.register(ASPMembership, (admin, 3u32));
    let client = ASPMembershipClient::new(&env, &contract_id);

    // Test hash_pair with two U256 values
    let left = U256::from_u32(&env, 1u32);
    let right = U256::from_u32(&env, 2u32);

    let result = client.hash_pair(&left, &right);

    // Verify result is a valid U256 (not zero, since we're hashing non-zero values)
    let zero = U256::from_u32(&env, 0u32);
    assert_ne!(result, zero);

    // Test that hash is deterministic
    let result2 = client.hash_pair(&left, &right);
    assert_eq!(result, result2);

    // Test that different inputs produce different hashes
    let left2 = U256::from_u32(&env, 3u32);
    let result3 = client.hash_pair(&left2, &right);
    assert_ne!(result, result3);
}

#[test]
fn test_insert_leaf() {
    let env = test_env();
    let admin = Address::generate(&env);
    let contract_id = env.register(ASPMembership, (admin.clone(), 3u32));
    let client = ASPMembershipClient::new(&env, &contract_id);

    // Mock all auths for testing purposes
    env.mock_all_auths();

    // Insert first leaf
    let leaf1 = U256::from_u32(&env, 100u32);
    client.insert_leaf(&leaf1);

    // Insert the second leaf
    let leaf2 = U256::from_u32(&env, 200u32);
    client.insert_leaf(&leaf2);

    // Check NextIndex after both insertions
    let next_index1: u64 = env.as_contract(&contract_id, || {
        env.storage()
            .persistent()
            .get(&DataKey::NextIndex)
            .expect("NextIndex set after insert")
    });
    assert_eq!(next_index1, 2, "NextIndex should be 2 after two insertions");
}

/// This test is skipped under Miri because the panic formatting path triggers
/// undefined behavior in the `ethnum` crate's unsafe formatting code.
/// See: https://github.com/nlordell/ethnum-rs/issues/34
#[test]
#[cfg_attr(miri, ignore)]
#[should_panic(expected = "Error(Auth, InvalidAction)")]
fn test_insert_leaf_requires_admin() {
    let env = test_env();
    let admin = Address::generate(&env);
    let contract_id = env.register(ASPMembership, (admin, 3u32));
    let client = ASPMembershipClient::new(&env, &contract_id);

    // Try to insert leaf
    // It should fail as we did not call mock_all_auths()
    let leaf = U256::from_u32(&env, 100u32);
    client.insert_leaf(&leaf);
}

/// This test is skipped under Miri because the panic formatting path triggers
/// undefined behavior in the `ethnum` crate's unsafe formatting code.
/// See: https://github.com/nlordell/ethnum-rs/issues/34
#[test]
#[cfg_attr(miri, ignore)]
#[should_panic]
fn test_insert_leaf_merkle_tree_full() {
    let env = test_env();
    let admin = Address::generate(&env);
    let contract_id = env.register(ASPMembership, (admin.clone(), 2u32));
    let client = ASPMembershipClient::new(&env, &contract_id);

    // Mock all auths for testing purposes
    env.mock_all_auths();

    // Insert 4 leaves
    for i in 0u32..4 {
        let leaf = U256::from_u32(&env, i + 1);
        client.insert_leaf(&leaf);
    }

    // Try to insert one more leaf, which should fail as the tree is full
    let leaf5 = U256::from_u32(&env, 5u32);
    client.insert_leaf(&leaf5);
}

#[test]
fn test_update_admin() {
    let env = test_env();
    let admin = Address::generate(&env);
    let new_admin = Address::generate(&env);
    let contract_id = env.register(ASPMembership, (admin.clone(), 3u32));
    let client = ASPMembershipClient::new(&env, &contract_id);

    // Verify admin was set correctly
    let stored_admin: Address = env.as_contract(&contract_id, || {
        env.storage()
            .persistent()
            .get(&DataKey::Admin)
            .expect("Admin set in constructor")
    });
    assert_eq!(stored_admin, admin);

    // Update admin (using mock_all_auths to authorize the update)
    env.mock_all_auths();
    client.update_admin(&new_admin);

    // Verify admin was updated in storage
    let stored_admin_after: Address = env.as_contract(&contract_id, || {
        env.storage()
            .persistent()
            .get(&DataKey::Admin)
            .expect("Admin updated")
    });
    assert_eq!(stored_admin_after, new_admin);
}

#[test]
fn test_new_admin_can_insert_after_update() {
    let env = test_env();
    let admin = Address::generate(&env);
    let new_admin = Address::generate(&env);
    let contract_id = env.register(ASPMembership, (admin.clone(), 3u32));
    let client = ASPMembershipClient::new(&env, &contract_id);

    env.mock_all_auths();
    // Update admin
    client.update_admin(&new_admin);

    // Verify the new admin can insert a leaf (using mock_all_auths to authorize)

    let leaf = U256::from_u32(&env, 100u32);
    client.insert_leaf(&leaf);

    // Verify the insertion succeeded
    let next_index: u64 = env.as_contract(&contract_id, || {
        env.storage()
            .persistent()
            .get(&DataKey::NextIndex)
            .expect("NextIndex set after insert")
    });
    assert_eq!(
        next_index, 1,
        "NextIndex should be 1 after insertion by new admin"
    );
}

#[test]
fn test_multiple_insertions() {
    let env = test_env();
    let admin = Address::generate(&env);
    let contract_id = env.register(ASPMembership, (admin.clone(), 3u32));
    let client = ASPMembershipClient::new(&env, &contract_id);

    env.mock_all_auths();

    // Insert 5 leaves
    for i in 0u32..5 {
        let leaf = U256::from_u32(&env, (i + 1) * 100u32);
        client.insert_leaf(&leaf);
    }

    // Verify NextIndex was updated correctly
    let next_index: u64 = env.as_contract(&contract_id, || {
        env.storage()
            .persistent()
            .get(&DataKey::NextIndex)
            .expect("NextIndex set after inserts")
    });
    assert_eq!(
        next_index, 5,
        "NextIndex should be 5 after inserting 5 leaves"
    );
}

#[test]
fn test_admin_insert_only_defaults_to_true() {
    let env = test_env();
    let admin = Address::generate(&env);
    let contract_id = env.register(ASPMembership, (admin, 3u32));

    let stored: bool = env.as_contract(&contract_id, || {
        env.storage()
            .persistent()
            .get(&DataKey::AdminInsertOnly)
            .expect("AdminInsertOnly set in constructor")
    });
    assert!(stored, "AdminInsertOnly should default to true");
}

#[test]
fn test_set_admin_insert_only() {
    let env = test_env();
    let admin = Address::generate(&env);
    let contract_id = env.register(ASPMembership, (admin, 3u32));
    let client = ASPMembershipClient::new(&env, &contract_id);

    env.mock_all_auths();

    // Disable admin-only insert
    client.set_admin_insert_only(&false);

    let stored: bool = env.as_contract(&contract_id, || {
        env.storage()
            .persistent()
            .get(&DataKey::AdminInsertOnly)
            .expect("AdminInsertOnly updated")
    });
    assert!(!stored, "AdminInsertOnly should be false after setting it");

    // Re-enable admin-only insert
    client.set_admin_insert_only(&true);

    let stored: bool = env.as_contract(&contract_id, || {
        env.storage()
            .persistent()
            .get(&DataKey::AdminInsertOnly)
            .expect("AdminInsertOnly re-enabled")
    });
    assert!(stored, "AdminInsertOnly should be true after re-enabling");
}

/// This test is skipped under Miri because the panic formatting path triggers
/// undefined behavior in the `ethnum` crate's unsafe formatting code.
/// See: https://github.com/nlordell/ethnum-rs/issues/34
#[test]
#[cfg_attr(miri, ignore)]
#[should_panic(expected = "Error(Auth, InvalidAction)")]
fn test_set_admin_insert_only_requires_admin() {
    let env = test_env();
    let admin = Address::generate(&env);
    let contract_id = env.register(ASPMembership, (admin, 3u32));
    let client = ASPMembershipClient::new(&env, &contract_id);

    // Should fail without mock_all_auths
    client.set_admin_insert_only(&false);
}

#[test]
fn test_insert_leaf_without_admin_when_permissionless() {
    let env = test_env();
    let admin = Address::generate(&env);
    let contract_id = env.register(ASPMembership, (admin, 3u32));
    let client = ASPMembershipClient::new(&env, &contract_id);

    // Admin disables admin-only insert via direct storage manipulation
    // to avoid needing mock_all_auths (which would mask the auth check
    // we're trying to verify is skipped).
    env.as_contract(&contract_id, || {
        env.storage()
            .persistent()
            .set(&DataKey::AdminInsertOnly, &false);
    });

    // Insert a leaf WITHOUT mock_all_auths — should succeed because
    // admin_insert_only is false
    let leaf = U256::from_u32(&env, 42u32);
    client.insert_leaf(&leaf);

    let next_index: u64 = env.as_contract(&contract_id, || {
        env.storage()
            .persistent()
            .get(&DataKey::NextIndex)
            .expect("NextIndex set after insert")
    });
    assert_eq!(next_index, 1, "Leaf should be inserted without admin auth");
}

/// This test is skipped under Miri because the panic formatting path triggers
/// undefined behavior in the `ethnum` crate's unsafe formatting code.
/// See: https://github.com/nlordell/ethnum-rs/issues/34
#[test]
#[cfg_attr(miri, ignore)]
#[should_panic(expected = "Error(Auth, InvalidAction)")]
fn test_insert_leaf_requires_admin_when_re_enabled() {
    let env = test_env();
    let admin = Address::generate(&env);
    let contract_id = env.register(ASPMembership, (admin, 3u32));
    let client = ASPMembershipClient::new(&env, &contract_id);

    // Disable admin-only insert via storage so we don't need mock_all_auths
    env.as_contract(&contract_id, || {
        env.storage()
            .persistent()
            .set(&DataKey::AdminInsertOnly, &false);
    });

    // Insert a leaf permissionlessly (should succeed)
    let leaf1 = U256::from_u32(&env, 100u32);
    client.insert_leaf(&leaf1);

    // Re-enable admin-only insert via storage
    env.as_contract(&contract_id, || {
        env.storage()
            .persistent()
            .set(&DataKey::AdminInsertOnly, &true);
    });

    // This should panic — admin auth is required again and no auths are mocked
    let leaf2 = U256::from_u32(&env, 200u32);
    client.insert_leaf(&leaf2);
}

#[test]
fn test_permissionless_insert_multiple_leaves() {
    let env = test_env();
    let admin = Address::generate(&env);
    let contract_id = env.register(ASPMembership, (admin, 3u32));
    let client = ASPMembershipClient::new(&env, &contract_id);

    env.mock_all_auths();
    client.set_admin_insert_only(&false);

    // Insert multiple leaves
    for i in 0..5 {
        let leaf = U256::from_u32(&env, (i + 1) * 10u32);
        client.insert_leaf(&leaf);
    }

    let next_index: u64 = env.as_contract(&contract_id, || {
        env.storage()
            .persistent()
            .get(&DataKey::NextIndex)
            .expect("NextIndex set after inserts")
    });
    assert_eq!(
        next_index, 5,
        "Should have 5 leaves after permissionless insertions"
    );
}

#[test]
fn test_permissionless_insert_updates_root() {
    let env = test_env();
    let admin = Address::generate(&env);
    let contract_id = env.register(ASPMembership, (admin, 3u32));
    let client = ASPMembershipClient::new(&env, &contract_id);

    env.mock_all_auths();
    client.set_admin_insert_only(&false);

    let root_before = client.get_root();

    let leaf = U256::from_u32(&env, 42u32);
    client.insert_leaf(&leaf);

    let root_after = client.get_root();
    assert_ne!(
        root_before, root_after,
        "Root should change after permissionless insert"
    );
}


#[test]
fn test_merkle_consistency() {
    let env = test_env();
    let admin = Address::generate(&env);
    // Initialize with 2 levels (4 leaves)
    let levels = 2u32;
    let contract_id = env.register(ASPMembership, (admin, levels));
    let client = ASPMembershipClient::new(&env, &contract_id);
    let num_leaves = 1u32 << levels;

    // Mock all auths for testing
    env.mock_all_auths();

    // Precomputed expected state off-chain using circomlib Poseidon
    // zeroes[0]=Poseidon(88,76,77), zeroes[i]=Poseidon(z[i-1],z[i-1])
    // roots computed by scripts/compute_poseidon_zeroes.ts
    let off_chain_roots: Vec<U256> = vec![
        &env,
        U256::from_be_bytes(
            &env,
            &Bytes::from_array(
                &env,
                &[
                    45, 174, 20, 182, 150, 163, 236, 189, 1, 146, 250, 93, 44, 14, 62, 128, 189,
                    232, 176, 249, 66, 206, 191, 112, 95, 146, 181, 85, 84, 10, 171, 176,
                ],
            ),
        ), // empty tree (zeroes[2])
        U256::from_be_bytes(
            &env,
            &Bytes::from_array(
                &env,
                &[
                    11, 128, 161, 105, 65, 50, 100, 24, 81, 255, 82, 141, 17, 242, 188, 127, 120,
                    193, 142, 199, 218, 170, 213, 34, 37, 103, 9, 200, 43, 211, 128, 235,
                ],
            ),
        ), // 1 leaf added
        U256::from_be_bytes(
            &env,
            &Bytes::from_array(
                &env,
                &[
                    18, 222, 245, 190, 193, 212, 163, 11, 52, 94, 111, 230, 178, 57, 93, 253, 52,
                    204, 42, 67, 148, 248, 244, 142, 13, 169, 140, 73, 229, 182, 70, 90,
                ],
            ),
        ), // 2 leaves added
        U256::from_be_bytes(
            &env,
            &Bytes::from_array(
                &env,
                &[
                    13, 114, 175, 27, 74, 94, 61, 234, 225, 201, 154, 219, 102, 163, 86, 36, 200,
                    69, 228, 229, 142, 207, 85, 24, 37, 207, 100, 83, 80, 51, 183, 78,
                ],
            ),
        ), // 3 leaves added
        U256::from_be_bytes(
            &env,
            &Bytes::from_array(
                &env,
                &[
                    28, 44, 129, 87, 53, 218, 97, 194, 211, 71, 217, 208, 46, 211, 215, 253, 70,
                    178, 218, 105, 104, 193, 196, 79, 77, 27, 8, 34, 130, 27, 132, 68,
                ],
            ),
        ), // 4 leaves added
    ];

    // Get the on-chain root
    let on_chain_root: U256 = env.as_contract(&contract_id, || {
        env.storage()
            .persistent()
            .get(&DataKey::Root)
            .expect("Root set in constructor")
    });

    // Empty roots should match
    assert_eq!(
        on_chain_root,
        off_chain_roots
            .get(0)
            .expect("off_chain_roots has element 0")
    );

    // Insert all leaves on-chain
    for i in 0..num_leaves {
        let leaf = U256::from_u32(&env, (i + 1) * 100u32);
        client.insert_leaf(&leaf);

        // Get the on-chain root
        let on_chain_root: U256 = env.as_contract(&contract_id, || {
            env.storage()
                .persistent()
                .get(&DataKey::Root)
                .expect("Root updated after insert")
        });

        // Enforce roots match after inserting a leaf
        assert_eq!(
            on_chain_root,
            off_chain_roots
                .get(i + 1)
                .expect("off_chain_roots has element")
        );
    }
}
