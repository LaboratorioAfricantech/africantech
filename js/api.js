// js/api.js
const API_URL = "https://africanstocks-backend-production.up.railway.app/api/v1";

const api = {
    async request(endpoint, method = 'GET', body = null) {
        const token = localStorage.getItem('token');
        
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        // LIMPEZA DA URL: Garante que não haja barras duplas //
        const url = `${API_URL}${endpoint}`;

        try {
            const response = await fetch(url, {
                method,
                headers,
                body: body ? JSON.stringify(body) : null
            });

            // Se retornar HTML (erro do servidor), o catch vai pegar o erro de JSON
            const data = await response.json();

            if (response.status === 401) {
                localStorage.clear();
                window.location.href = 'login.html';
            }

            return data;
        } catch (error) {
            console.error("Erro na API:", error);
            return { sucesso: false, mensagem: "Erro na rota ou servidor fora do ar." };
        }
    }
};