import React, { useEffect, useState } from 'react';
import axios from 'axios';

function App() {
    const [user, setUser] = useState(null);
    const [usage, setUsage] = useState(null);
    const [billing, setBilling] = useState(null);

    useEffect(() => {
        async function fetchUser() {
            try {
                const response = await axios.get('/api/user');
                setUser(response.data);
            } catch (error) {
                console.error('Error fetching user data:', error);
            }
        }
        fetchUser();
    }, []);

    useEffect(() => {
        if (user) {
            async function fetchUsage() {
                try {
                    const response = await axios.get('/api/usage');
                    setUsage(response.data);
                } catch (error) {
                    console.error('Error fetching usage data:', error);
                }
            }
            fetchUsage();

            async function fetchBilling() {
                try {
                    const response = await axios.get('/api/billing');
                    setBilling(response.data);
                } catch (error) {
                    console.error('Error fetching billing data:', error);
                }
            }
            fetchBilling();
        }
    }, [user]);

    const generateInvoice = async () => {
        try {
            await axios.post('/api/invoice');
            alert('Invoice generated');
        } catch (error) {
            console.error('Error generating invoice:', error);
        }
    };

    return (
        <div className="App">
            {user ? (
                <>
                    <h1>Welcome, {user.displayName}</h1>
                    <h2>Usage Details</h2>
                    {usage ? <p>{usage.usage} units used</p> : <p>Loading...</p>}
                    <h2>Billing Information</h2>
                    {billing ? <p>Current Billing Cycle: {billing.cycle}</p> : <p>Loading...</p>}
                    <button onClick={generateInvoice}>Generate Invoice</button>
                </>
            ) : (
                <a href="/auth/google">Login with Google</a>
            )}
        </div>
    );
}

export default App;
