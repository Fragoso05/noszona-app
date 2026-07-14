// =====================================================
// FOTOS.JS - NOSZONA Smart
// Parte nova para foto de perfil e foto do BI
// Não mexe no main.js
// =====================================================

console.log("✅ fotos.js carregado");

let fotoPerfilBase64 = "";
let fotoBIBase64 = "";

// =====================================================
// CÂMERA DIRETA DO COMPUTADOR
// =====================================================
let cameraStreamAtual = null;
let tipoFotoCameraAtual = "";
let modoTrocaPerfilCliente = false;

function comprimirImagem(file, maxWidth = 900, qualidade = 0.75) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve("");
      return;
    }

    if (!file.type.startsWith("image/")) {
      reject(new Error("O ficheiro selecionado não é uma imagem."));
      return;
    }

    const reader = new FileReader();

    reader.onload = function(event) {
      const img = new Image();

      img.onload = function() {
        const canvas = document.createElement("canvas");

        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const base64 = canvas.toDataURL("image/jpeg", qualidade);
        resolve(base64);
      };

      img.onerror = function() {
        reject(new Error("Não foi possível ler a imagem."));
      };

      img.src = event.target.result;
    };

    reader.onerror = function() {
      reject(new Error("Erro ao carregar o ficheiro."));
    };

    reader.readAsDataURL(file);
  });
}

function abrirSeletorFoto(tipo) {
  const input = tipo === "perfil"
    ? document.getElementById("inputFotoPerfil")
    : document.getElementById("inputFotoCatao");

  if (input) {
    input.click();
  }
}

async function selecionarFotoPerfil(input) {
  try {
    const file = input.files && input.files[0];

    if (!file) return;

    fotoPerfilBase64 = await comprimirImagem(file, 700, 0.75);

    const preview = document.getElementById("previewFotoPerfil");
    if (preview) {
      preview.innerHTML = `<img src="${fotoPerfilBase64}" alt="Foto de perfil">`;
    }

  } catch (erro) {
    alert(erro.message || "Erro ao selecionar foto de perfil.");
  }
}

async function selecionarFotoCartao(input) {
  try {
    const file = input.files && input.files[0];

    if (!file) return;

    fotoCartaoBase64 = await comprimirImagem(file, 1000, 0.75);

    const preview = document.getElementById("previewFotoCartao");
    if (preview) {
      preview.innerHTML = `<img src="${fotoCartaoBase64}" alt="Foto do cartão">`;
    }

  } catch (erro) {
    alert(erro.message || "Erro ao selecionar foto do cartão.");
  }
}

// =====================================================
// FUNÇÃO ABRE A CÂMERA 
// =====================================================
async function tirarFoto(tipo) {
  try {
    tipoFotoCameraAtual = tipo;
    modoTrocaPerfilCliente = false;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Este navegador não permite abrir a câmera diretamente. Usa a opção escolher ficheiro.");
      return;
    }

    criarModalCameraSeNaoExistir();

    const modal = document.getElementById("modalCameraFotos");
    const video = document.getElementById("videoCameraFotos");

    cameraStreamAtual = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: tipo === "bi" ? "environment" : "user"
      },
      audio: false
    });

    video.srcObject = cameraStreamAtual;
    modal.classList.add("ativo");

  } catch (erro) {
    console.error("Erro ao abrir câmera:", erro);
    alert("Não foi possível abrir a câmera. Verifica se deste permissão ao navegador.");
  }
}

function criarModalCameraSeNaoExistir() {
  if (document.getElementById("modalCameraFotos")) {
    return;
  }

  const modal = document.createElement("div");
  modal.id = "modalCameraFotos";
  modal.className = "modal-camera-fotos";

  modal.innerHTML = `
    <div class="modal-camera-conteudo">
      <h3>Tirar foto</h3>

      <video id="videoCameraFotos" autoplay playsinline></video>

      <canvas id="canvasCameraFotos" style="display:none;"></canvas>

      <div class="modal-camera-acoes">
        <button type="button" onclick="capturarFotoCamera()">Capturar foto</button>
        <button type="button" onclick="fecharCameraFotos()">Cancelar</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

async function capturarFotoCamera() {
  const video = document.getElementById("videoCameraFotos");
  const canvas = document.getElementById("canvasCameraFotos");

  if (!video || !canvas) {
    alert("Câmera não encontrada.");
    return;
  }

  if (!video.videoWidth || !video.videoHeight) {
    alert("A câmera ainda não está pronta. Aguarda 1 segundo e tenta novamente.");
    return;
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const fotoBase64 = canvas.toDataURL("image/jpeg", 0.75);

  if (modoTrocaPerfilCliente) {
    await enviarNovaFotoPerfilClienteBase64(fotoBase64);
    fecharCameraFotos();
    return;
  }

  if (tipoFotoCameraAtual === "perfil") {
    fotoPerfilBase64 = fotoBase64;

    const preview = document.getElementById("previewFotoPerfil");
    if (preview) {
      preview.innerHTML = `<img src="${fotoPerfilBase64}" alt="Foto de perfil">`;
    }
  }

  if (tipoFotoCameraAtual === "bi") {
    fotoBIBase64 = fotoBase64;

    const preview = document.getElementById("previewFotoBI");
    if (preview) {
      preview.innerHTML = `<img src="${fotoBIBase64}" alt="Foto do BI">`;
    }
  }

  fecharCameraFotos();
}

function fecharCameraFotos() {
  const modal = document.getElementById("modalCameraFotos");
  const video = document.getElementById("videoCameraFotos");

  if (cameraStreamAtual) {
    cameraStreamAtual.getTracks().forEach(track => track.stop());
    cameraStreamAtual = null;
  }

  if (video) {
    video.srcObject = null;
  }

  if (modal) {
    modal.classList.remove("ativo");
  }

  tipoFotoCameraAtual = "";
  modoTrocaPerfilCliente = false;
}

function removerFotoPerfil() {
  fotoPerfilBase64 = "";

  const preview = document.getElementById("previewFotoPerfil");
  if (preview) {
    preview.innerHTML = `<span>Sem foto de perfil</span>`;
  }

  const input = document.getElementById("inputFotoPerfil");
  const camera = document.getElementById("inputCameraPerfil");

  if (input) input.value = "";
  if (camera) camera.value = "";
}

function removerFotoBI() {
  fotoBIBase64 = "";

  const preview = document.getElementById("previewFotoBI");
  if (preview) {
    preview.innerHTML = `<span>Sem foto do BI</span>`;
  }

  const input = document.getElementById("inputFotoBI");
  const camera = document.getElementById("inputCameraBI");

  if (input) input.value = "";
  if (camera) camera.value = "";
}

async function selecionarFotoCameraPerfil(input) {
  await selecionarFotoPerfil(input);
}



async function selecionarFotoCameraBI(input) {
  await selecionarFotoBI(input);
}

function obterFotosRegisto() {
  return {
    fotoPerfilBase64,
    fotoPerfilTipo: fotoPerfilBase64 ? "image/jpeg" : "",
    fotoBIBase64,
    fotoBITipo: fotoBIBase64 ? "image/jpeg" : ""
  };
}

async function enviarFotosDepoisDoRegisto(residenteId) {
  if (!residenteId) {
    console.warn("Sem residenteId. As fotos não foram enviadas.");
    return;
  }

  if (!fotoBIBase64) {
    throw new Error("A foto do Bilhete de Identidade é obrigatória para concluir o registo.");
  }

  const payload = {
    residenteId,
    fotoPerfilBase64,
    fotoPerfilTipo: fotoPerfilBase64 ? "image/jpeg" : "",
    fotoBIBase64,
    fotoBITipo: "image/jpeg"
  };

  const resposta = await fetch("https://violet-beaver-178312.hostingersite.com/api/residentes/fotos", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const dados = await resposta.json();

  if (!resposta.ok || !dados.sucesso) {
    throw new Error(dados.mensagem || "Erro ao enviar fotos.");
  }

  return dados;
}

function montarImagemBase64(base64, tipo) {
  if (!base64) return "";

  if (base64.startsWith("data:image")) {
    return base64;
  }

  return "data:" + (tipo || "image/jpeg") + ";base64," + base64;
}

function getFotoPerfilDoResidente(residente) {
  if (!residente) return "";

  return montarImagemBase64(
    residente.fotoPerfilBase64 ||
    residente.fotoPerfil ||
    residente.foto_perfil ||
    residente.foto_perfil_base64 ||
    "",
    residente.fotoPerfilTipo ||
    residente.foto_perfil_tipo ||
    "image/jpeg"
  );
}

function abrirMenuFotoPerfil() {
  const menu = document.getElementById("menuFotoPerfilCliente");

  if (!menu) return;

  menu.classList.toggle("ativo");
}

function fecharMenuFotoPerfil() {
  const menu = document.getElementById("menuFotoPerfilCliente");

  if (!menu) return;

  menu.classList.remove("ativo");
}

function renderizarFotoPerfilCliente(residente) {
  const area = document.getElementById("areaFotoPerfilCliente");

  if (!area) return;

  const fotoSrc = getFotoPerfilDoResidente(residente);
  const nome = residente && residente.nome ? residente.nome : "Utilizador";
  const inicial = nome.trim().charAt(0).toUpperCase() || "N";

  if (fotoSrc) {
    area.innerHTML = `
      <div class="cliente-foto-wrapper">
        <button class="cliente-foto-btn" onclick="abrirMenuFotoPerfil()" title="Alterar foto de perfil">
          <img src="${fotoSrc}" alt="Foto de perfil">
        </button>

        <div id="menuFotoPerfilCliente" class="menu-foto-cliente">
          <button onclick="verFotoPerfilCliente()">Ver foto</button>
          <button onclick="abrirSeletorTrocaPerfil()">Escolher dos ficheiros</button>
          <button onclick="abrirCameraTrocaPerfil()">Tirar foto agora</button>
          <button onclick="removerFotoPerfilCliente()">Remover foto</button>
          <button onclick="fecharMenuFotoPerfil()">Cancelar</button>
        </div>
      </div>
    `;
  } else {
    area.innerHTML = `
      <div class="cliente-foto-wrapper">
        <button class="cliente-foto-btn sem-foto" onclick="abrirMenuFotoPerfil()" title="Adicionar foto de perfil">
          ${inicial}
        </button>

        <div id="menuFotoPerfilCliente" class="menu-foto-cliente">
          <button onclick="abrirSeletorTrocaPerfil()">Escolher dos ficheiros</button>
          <button onclick="abrirCameraTrocaPerfil()">Tirar foto agora</button>
          <button onclick="fecharMenuFotoPerfil()">Cancelar</button>
        </div>
      </div>
    `;
  }
}

function criarInputsTrocaPerfilSeNaoExistir() {
  if (!document.getElementById("trocarFotoPerfilInput")) {
    const input = document.createElement("input");
    input.type = "file";
    input.id = "trocarFotoPerfilInput";
    input.accept = "image/*";
    input.style.display = "none";
    input.onchange = async function() {
      await enviarNovaFotoPerfilCliente(this);
    };
    document.body.appendChild(input);
  }

  if (!document.getElementById("trocarFotoPerfilCamera")) {
    const input = document.createElement("input");
    input.type = "file";
    input.id = "trocarFotoPerfilCamera";
    input.accept = "image/*";
    input.capture = "user";
    input.style.display = "none";
    input.onchange = async function() {
      await enviarNovaFotoPerfilCliente(this);
    };
    document.body.appendChild(input);
  }
}

function abrirSeletorTrocaPerfil() {
  criarInputsTrocaPerfilSeNaoExistir();

  const input = document.getElementById("trocarFotoPerfilInput");
  if (input) input.click();
}



// =====================================================
// FUNÇÃO ATUALIZADA: TIRAR FOTO DO PERFIL NO DASHBOARD
// =====================================================
async function abrirCameraTrocaPerfil() {
  try {
    tipoFotoCameraAtual = "perfil";
    modoTrocaPerfilCliente = true;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Este navegador não permite abrir a câmera diretamente. Usa a opção escolher ficheiro.");
      return;
    }

    criarModalCameraSeNaoExistir();

    const modal = document.getElementById("modalCameraFotos");
    const video = document.getElementById("videoCameraFotos");

    cameraStreamAtual = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user"
      },
      audio: false
    });

    video.srcObject = cameraStreamAtual;
    modal.classList.add("ativo");

  } catch (erro) {
    console.error("Erro ao abrir câmera:", erro);
    alert("Não foi possível abrir a câmera. Verifica se deste permissão ao navegador.");
  }
}

async function enviarNovaFotoPerfilCliente(input) {
  try {
    const user = typeof window.getResidenteLogado === "function"
      ? window.getResidenteLogado()
      : window.residenteLogado;

    if (!user) {
      alert("Faz login primeiro.");
      return;
    }

    const file = input.files && input.files[0];

    if (!file) return;

    const novaFoto = await comprimirImagem(file, 700, 0.75);

    const resposta = await fetch("https://violet-beaver-178312.hostingersite.com/api/residentes/fotos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        residenteId: user.id,
        fotoPerfilBase64: novaFoto,
        fotoPerfilTipo: "image/jpeg"
      })
    });

    const dados = await resposta.json();

    if (!resposta.ok || !dados.sucesso) {
      alert(dados.mensagem || "Erro ao alterar foto de perfil.");
      return;
    }

    user.fotoPerfilBase64 = novaFoto;
    user.fotoPerfilTipo = "image/jpeg";

    window.residenteLogado = user;

    if (typeof window.guardarSessao === "function") {
      window.guardarSessao(user, null, false);
    }

    renderizarFotoPerfilCliente(user);

    alert("Foto de perfil atualizada com sucesso.");

  } catch (erro) {
    alert(erro.message || "Erro ao enviar foto.");
  }
}

async function enviarNovaFotoPerfilClienteBase64(novaFoto) {
  try {
    const user = typeof window.getResidenteLogado === "function"
      ? window.getResidenteLogado()
      : window.residenteLogado;

    if (!user) {
      alert("Faz login primeiro.");
      return;
    }

    if (!novaFoto) {
      alert("Foto inválida.");
      return;
    }

    const resposta = await fetch("https://violet-beaver-178312.hostingersite.com/api/residentes/fotos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        residenteId: user.id,
        fotoPerfilBase64: novaFoto,
        fotoPerfilTipo: "image/jpeg"
      })
    });

    const dados = await resposta.json();

    if (!resposta.ok || !dados.sucesso) {
      alert(dados.mensagem || "Erro ao alterar foto de perfil.");
      return;
    }

    user.fotoPerfilBase64 = novaFoto;
    user.fotoPerfilTipo = "image/jpeg";

    window.residenteLogado = user;

    if (typeof window.guardarSessao === "function") {
      window.guardarSessao(user, null, false);
    }

    renderizarFotoPerfilCliente(user);

    alert("Foto de perfil atualizada com sucesso.");

  } catch (erro) {
    alert(erro.message || "Erro ao enviar foto.");
  }
}

async function removerFotoPerfilCliente() {
  try {
    const user = typeof window.getResidenteLogado === "function"
      ? window.getResidenteLogado()
      : window.residenteLogado;

    if (!user) {
      alert("Faz login primeiro.");
      return;
    }

    if (!confirm("Queres remover a foto de perfil?")) {
      return;
    }

    const resposta = await fetch("https://violet-beaver-178312.hostingersite.com/api/residentes/fotos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        residenteId: user.id,
        fotoPerfilBase64: "",
        removerFotoPerfil: true
      })
    });

    let dados = {};
    try {
      dados = await resposta.json();
    } catch (e) {}

    if (!resposta.ok || dados.sucesso === false) {
      alert(dados.mensagem || "Erro ao remover foto.");
      return;
    }

    user.fotoPerfilBase64 = "";
    user.fotoPerfilTipo = "";

    window.residenteLogado = user;

    if (typeof window.guardarSessao === "function") {
      window.guardarSessao(user, null, false);
    }

    renderizarFotoPerfilCliente(user);

    alert("Foto de perfil removida.");

  } catch (erro) {
    alert("Erro ao remover foto.");
  }
}

function verFotoPerfilCliente() {
  const user = typeof window.getResidenteLogado === "function"
    ? window.getResidenteLogado()
    : window.residenteLogado;

  if (!user) {
    alert("Faz login primeiro.");
    return;
  }

  const fotoSrc = getFotoPerfilDoResidente(user);

  if (!fotoSrc) {
    alert("Este residente ainda não tem foto de perfil.");
    return;
  }

  fecharMenuFotoPerfil();

  let modal = document.getElementById("modalVerFotoPerfilCliente");

  if (!modal) {
    modal = document.createElement("div");
    modal.id = "modalVerFotoPerfilCliente";
    modal.className = "modal-foto-perfil-cliente";

    modal.innerHTML = `
      <div class="modal-foto-perfil-conteudo">
        <img id="modalVerFotoPerfilImg" src="" alt="Foto de perfil">

        <div class="modal-foto-perfil-acoes">
          <button type="button" onclick="fecharVerFotoPerfilCliente()">Fechar</button>
        </div>
      </div>
    `;

    modal.onclick = function(e) {
      if (e.target === modal) {
        fecharVerFotoPerfilCliente();
      }
    };

    document.body.appendChild(modal);
  }

  const img = document.getElementById("modalVerFotoPerfilImg");
  if (img) {
    img.src = fotoSrc;
  }

  modal.classList.add("ativo");
}



function fecharVerFotoPerfilCliente() {
  const modal = document.getElementById("modalVerFotoPerfilCliente");
  const img = document.getElementById("modalVerFotoPerfilImg");

  if (img) {
    img.src = "";
  }

  if (modal) {
    modal.classList.remove("ativo");
  }
}
// After filling name/ID etc.
const fotoCartaoArea = document.getElementById("areaFotoCartao");
if (fotoCartaoArea) {
  const fotoSrc = getFotoPerfilDoResidente(r); // reuse existing function
  if (fotoSrc) {
    fotoCartaoArea.innerHTML = `<img src="${fotoSrc}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;" />`;
  }
}

// Expor funções para o HTML e para o main.js
window.abrirSeletorFoto = abrirSeletorFoto;
window.tirarFoto = tirarFoto;
window.selecionarFotoPerfil = selecionarFotoPerfil;
window.selecionarFotoCartao = selecionarFotoCartao;
window.selecionarFotoCameraPerfil = selecionarFotoCameraPerfil;
window.selecionarFotoCameraBI = selecionarFotoCameraBI;
window.removerFotoPerfil = removerFotoPerfil;
window.removerFotoBI = removerFotoBI;
window.obterFotosRegisto = obterFotosRegisto;
window.enviarFotosDepoisDoRegisto = enviarFotosDepoisDoRegisto;
window.renderizarFotoPerfilCliente = renderizarFotoPerfilCliente;
window.abrirMenuFotoPerfil = abrirMenuFotoPerfil;
window.fecharMenuFotoPerfil = fecharMenuFotoPerfil;
window.abrirSeletorTrocaPerfil = abrirSeletorTrocaPerfil;
window.abrirCameraTrocaPerfil = abrirCameraTrocaPerfil;
window.removerFotoPerfilCliente = removerFotoPerfilCliente;
window.capturarFotoCamera = capturarFotoCamera;
window.fecharCameraFotos = fecharCameraFotos;
window.verFotoPerfilCliente = verFotoPerfilCliente;
window.fecharVerFotoPerfilCliente = fecharVerFotoPerfilCliente;