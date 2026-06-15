// js/api.js

const API_URL = "https://africanstocks-backend-production.up.railway.app/api/v1";

// const API_URL = "http://localhost:3000/api/v1";
const api = {
    async request(endpoint, method = 'GET', body = null) {
        const token = localStorage.getItem('token');
        
        // CORREÇÃO: Variável sem espaço e uso de crases
        const rotaLimpa = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        const url = `${API_URL}${rotaLimpa}`;

        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        try {
            const response = await fetch(url, {
                method: method.toUpperCase(),
                headers,
                body: body ? JSON.stringify(body) : null
            });

            if (response.status === 401) {
                console.warn("sessão expirada.");
                localStorage.clear();
                if (!window.location.href.includes('login.html')) {
                    window.location.href = 'login.html';
                }
                return null;
            }

            return await response.json();
        } catch (error) {
            console.error("erro na api:", error);
            return { sucesso: false, mensagem: "erro de ligação" };
        }
    }
};