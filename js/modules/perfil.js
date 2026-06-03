// js/modules/perfil.js

async function renderPerfil() {
    const main = document.getElementById('main-content');
    main.innerHTML = `<div class="loading">carregando ficha de perfil...</div>`;

    const res = await api.request('/perfil/me');

    if (res.sucesso) {
        const u = res.dados;
        const iniciais = u.nome.substring(0, 2).toUpperCase();

        main.innerHTML = `
            <div class="module-header">
                <h2>minha conta e perfil</h2>
            </div>

            <div class="profile-card">
                <div class="primavera-card" style="text-align:center;">
                    <div class="profile-photo-big">
                        ${u.foto_url ? `<img src="${u.foto_url}" style="width:100%; height:100%; object-fit:cover;">` : iniciais}
                    </div>
                    <h3 style="margin-bottom:5px;">${u.nome.toLowerCase()}</h3>
                    <p style="color:var(--text-secondary); margin-bottom:20px;">${u.funcao.toLowerCase()} | 📍 ${u.provincia_nome.toLowerCase()}</p>
                    
                    <div style="text-align:left; border-top: 1px solid #eee; padding-top:20px;">
                        <div class="form-row" style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
                            <div>
                                <label style="font-size:10px; font-weight:bold;">e-mail de acesso:</label>
                                <input type="text" class="input-erp" style="width:100%" value="${u.email}" readonly>
                            </div>
                            <div>
                                <label style="font-size:10px; font-weight:bold;">telefone/contacto:</label>
                                <input type="text" class="input-erp" style="width:100%" value="${u.telefone || 'não registado'}" readonly>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="primavera-card" style="border-top: 4px solid var(--danger);">
                    <h4>alterar senha de acesso</h4>
                    <div class="form-group" style="margin-bottom:15px;">
                        <label style="display:block; font-size:11px;">senha actual:</label>
                        <input type="password" id="pass-atual" class="input-erp" style="width:100%">
                    </div>
                    <div class="form-group" style="margin-bottom:15px;">
                        <label style="display:block; font-size:11px;">nova senha:</label>
                        <input type="password" id="pass-nova" class="input-erp" style="width:100%">
                    </div>
                    <button class="btn-primary" style="background:var(--danger);" onclick="atualizarSenha()">actualizar credenciais</button>
                </div>
            </div>
        `;
    }
}

async function atualizarSenha() {
    const senhaAtual = document.getElementById('pass-atual').value;
    const novaSenha = document.getElementById('pass-nova').value;

    if(!senhaAtual || !novaSenha) return alert("preencha os campos de senha.");

    const res = await api.request('/perfil/alterar-senha', 'PATCH', { senhaAtual, novaSenha });
    
    if(res.sucesso) {
        alert("senha alterada com sucesso!");
        document.getElementById('pass-atual').value = '';
        document.getElementById('pass-nova').value = '';
    } else {
        alert("erro: " + res.mensagem);
    }
}