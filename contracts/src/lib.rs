#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Symbol, symbol_short};

// Storage keys
const SUBSCRIPTION: Symbol = symbol_short!("SUB");
const SCAN_COUNT: Symbol = symbol_short!("SCAN");

#[contracttype]
#[derive(Clone)]
pub struct Subscription {
    pub subscriber: Address,
    pub expires_at: u64,      // Ledger number when subscription expires
    pub scans_remaining: u32, // Number of scans left
}

#[contract]
pub struct SubscriptionContract;

#[contractimpl]
impl SubscriptionContract {
    /// Subscribe a wallet for 30 days (approx 518,400 ledgers @ 5s/ledger)
    /// Grants 100 wallet scans
    pub fn subscribe(env: Env, subscriber: Address) -> Subscription {
        subscriber.require_auth();

        let current_ledger = env.ledger().sequence() as u64;
        let expires_at = current_ledger + 518_400; // ~30 days

        let subscription = Subscription {
            subscriber: subscriber.clone(),
            expires_at,
            scans_remaining: 100,
        };

        // Store subscription
        env.storage()
            .persistent()
            .set(&(SUBSCRIPTION, subscriber.clone()), &subscription);

        subscription
    }

    /// Check if a subscriber has an active subscription
    pub fn is_active(env: Env, subscriber: Address) -> bool {
        let key = (SUBSCRIPTION, subscriber);
        
        if let Some(sub) = env.storage().persistent().get::<_, Subscription>(&key) {
            let current_ledger = env.ledger().sequence() as u64;
            sub.expires_at > current_ledger && sub.scans_remaining > 0
        } else {
            false
        }
    }

    /// Consume one scan credit
    pub fn consume_scan(env: Env, subscriber: Address) -> u32 {
        subscriber.require_auth();

        let key = (SUBSCRIPTION, subscriber.clone());
        
        let mut sub = env.storage()
            .persistent()
            .get::<_, Subscription>(&key)
            .expect("No subscription found");

        let current_ledger = env.ledger().sequence() as u64;
        assert!(sub.expires_at > current_ledger, "Subscription expired");
        assert!(sub.scans_remaining > 0, "No scans remaining");

        sub.scans_remaining -= 1;
        
        env.storage()
            .persistent()
            .set(&key, &sub);

        sub.scans_remaining
    }

    /// Get subscription details
    pub fn get_subscription(env: Env, subscriber: Address) -> Option<Subscription> {
        let key = (SUBSCRIPTION, subscriber);
        env.storage().persistent().get(&key)
    }

    /// Renew subscription (adds 30 days and 100 scans)
    pub fn renew(env: Env, subscriber: Address) -> Subscription {
        subscriber.require_auth();

        let key = (SUBSCRIPTION, subscriber.clone());
        let current_ledger = env.ledger().sequence() as u64;

        let mut sub = if let Some(existing) = env.storage().persistent().get::<_, Subscription>(&key) {
            // Extend existing subscription
            let new_expires = if existing.expires_at > current_ledger {
                existing.expires_at + 518_400
            } else {
                current_ledger + 518_400
            };
            
            Subscription {
                subscriber: subscriber.clone(),
                expires_at: new_expires,
                scans_remaining: existing.scans_remaining + 100,
            }
        } else {
            // Create new subscription
            Subscription {
                subscriber: subscriber.clone(),
                expires_at: current_ledger + 518_400,
                scans_remaining: 100,
            }
        };

        env.storage()
            .persistent()
            .set(&key, &sub);

        sub
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Address, Env};

    #[test]
    fn test_subscribe() {
        let env = Env::default();
        let contract_id = env.register_contract(None, SubscriptionContract);
        let client = SubscriptionContractClient::new(&env, &contract_id);

        let subscriber = Address::generate(&env);

        env.mock_all_auths();

        let sub = client.subscribe(&subscriber);
        
        assert_eq!(sub.scans_remaining, 100);
        assert!(sub.expires_at > env.ledger().sequence());
    }

    #[test]
    fn test_is_active() {
        let env = Env::default();
        let contract_id = env.register_contract(None, SubscriptionContract);
        let client = SubscriptionContractClient::new(&env, &contract_id);

        let subscriber = Address::generate(&env);

        env.mock_all_auths();

        // Not active before subscription
        assert!(!client.is_active(&subscriber));

        // Active after subscription
        client.subscribe(&subscriber);
        assert!(client.is_active(&subscriber));
    }

    #[test]
    fn test_consume_scan() {
        let env = Env::default();
        let contract_id = env.register_contract(None, SubscriptionContract);
        let client = SubscriptionContractClient::new(&env, &contract_id);

        let subscriber = Address::generate(&env);

        env.mock_all_auths();

        client.subscribe(&subscriber);
        
        let remaining = client.consume_scan(&subscriber);
        assert_eq!(remaining, 99);

        let remaining = client.consume_scan(&subscriber);
        assert_eq!(remaining, 98);
    }

    #[test]
    fn test_renew() {
        let env = Env::default();
        let contract_id = env.register_contract(None, SubscriptionContract);
        let client = SubscriptionContractClient::new(&env, &contract_id);

        let subscriber = Address::generate(&env);

        env.mock_all_auths();

        let sub1 = client.subscribe(&subscriber);
        let sub2 = client.renew(&subscriber);

        assert_eq!(sub2.scans_remaining, 200); // 100 + 100
        assert!(sub2.expires_at > sub1.expires_at);
    }
}
