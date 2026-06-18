use crate::error::Error;
use crate::pool::PoolContract;
use soroban_sdk::{contracttype, Address, Env, Map, U256};

/// Storage keys for contract persistent data
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) enum DataKey {
    /// Administrator address with permissions to modify contract settings
    Admin,
    /// Address of the token contract used for deposits/withdrawals
    Token,
    /// Address of the ZK proof verifier contract
    Verifier,
    /// Maximum allowed deposit amount per transaction
    MaximumDepositAmount,
    /// Map of spent nullifiers (nullifier -> bool)
    Nullifiers,
    /// Address of the ASP Membership contract
    ASPMembership,
    /// Address of the ASP Non-Membership contract
    ASPNonMembership,
}

impl PoolContract {
    pub(crate) fn get_nullifiers(env: &Env) -> Result<Map<U256, bool>, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Nullifiers)
            .ok_or(Error::NotInitialized)
    }

    pub(crate) fn set_nullifiers(env: &Env, m: &Map<U256, bool>) {
        env.storage().persistent().set(&DataKey::Nullifiers, m);
    }

    pub(crate) fn get_token(env: &Env) -> Result<Address, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Token)
            .ok_or(Error::NotInitialized)
    }

    pub(crate) fn get_maximum_deposit(env: &Env) -> Result<U256, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::MaximumDepositAmount)
            .ok_or(Error::NotInitialized)
    }

    pub(crate) fn get_verifier(env: &Env) -> Result<Address, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Verifier)
            .ok_or(Error::NotInitialized)
    }

    pub(crate) fn get_admin(env: &Env) -> Result<Address, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)
    }

    pub(crate) fn get_asp_membership(env: &Env) -> Result<Address, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::ASPMembership)
            .ok_or(Error::NotInitialized)
    }

    pub(crate) fn get_asp_non_membership(env: &Env) -> Result<Address, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::ASPNonMembership)
            .ok_or(Error::NotInitialized)
    }
}
