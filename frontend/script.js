document.addEventListener("DOMContentLoaded", function() {
  const floors = document.getElementById("floors");
  const floor2Fields = document.getElementById("floor2Fields");
  const form = document.getElementById("predictionForm");
  const resultDiv = document.getElementById("result");

  // Charts instances
  let floorChartInstance, roomChartInstance;

  // Show/hide second floor fields
  floors.addEventListener("change", function() {
    floor2Fields.classList.toggle("d-none", this.value !== "2");
  });

  // Predict button logic
  form.addEventListener("submit", async function(e) {
    e.preventDefault();

    const floorsValue = parseInt(floors.value);
    let sqft = parseFloat(document.getElementById("sqft1").value || 0);
    let rooms = parseFloat(document.getElementById("rooms1").value || 0);
    let baths = parseFloat(document.getElementById("baths1").value || 0);
    let kitchen = parseFloat(document.getElementById("kitchen1").value || 0);
    let sitout = parseFloat(document.getElementById("sitout1").value || 0);

    if (floorsValue === 2) {
      sqft += parseFloat(document.getElementById("sqft2").value || 0);
      rooms += parseFloat(document.getElementById("rooms2").value || 0);
      baths += parseFloat(document.getElementById("baths2").value || 0);
      kitchen += parseFloat(document.getElementById("kitchen2").value || 0);
      sitout += parseFloat(document.getElementById("sitout2").value || 0);
    }

    if (!floorsValue || sqft <= 0 || rooms <= 0) {
      resultDiv.innerHTML = `<span class="text-danger">Please fill in all required fields correctly.</span>`;
      return;
    }

    const payload = { square_feet: sqft, rooms, bathrooms: baths, kitchen, sitout, floors: floorsValue };
    resultDiv.innerHTML = `<div class="text-info">Predicting...</div>`;

    try {
      const response = await fetch("http://127.0.0.1:5000/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      resultDiv.innerHTML = `
        Estimated Budget: <span class="text-success fw-bold">₹${data.estimated_budget.toLocaleString()}</span><br>
        Confidence Range: <span class="text-warning">₹${data.min_budget.toLocaleString()} - ₹${data.max_budget.toLocaleString()}</span>
      `;

      // Generate Charts
      createCharts(floorsValue, rooms, kitchen, baths, sitout, data.estimated_budget);

      // Draw 2D Blueprint with budget overlay
      drawBlueprint(
        floorsValue,
        parseInt(document.getElementById("rooms1").value || 0),
        parseInt(document.getElementById("kitchen1").value || 0),
        parseInt(document.getElementById("baths1").value || 0),
        parseInt(document.getElementById("sitout1").value || 0),
        parseInt(document.getElementById("rooms2").value || 0),
        parseInt(document.getElementById("kitchen2").value || 0),
        parseInt(document.getElementById("baths2").value || 0),
        parseInt(document.getElementById("sitout2").value || 0),
        data.estimated_budget
      );

    } catch (error) {
      console.error(error);
      resultDiv.innerHTML = `<span class="text-danger">Error connecting to prediction server</span>`;
    }
  });

  // --- Chart Creation ---
  function createCharts(floorValue, rooms, kitchen, baths, sitout, estimatedBudget) {
    if (!estimatedBudget || rooms + kitchen + baths + sitout <= 0) return;

    const floorCtx = document.getElementById("floorChart").getContext("2d");
    const roomCtx = document.getElementById("roomChart").getContext("2d");

    const floorLabels = floorValue === 1 ? ["Floor 1"] : ["Floor 1", "Floor 2"];
    const floorData = floorValue === 1 ? [estimatedBudget] : [estimatedBudget * 0.55, estimatedBudget * 0.45];

    const componentLabels = [];
    const componentData = [];

    for (let i = 1; i <= rooms; i++) {
      componentLabels.push(`Room ${i}`);
      componentData.push(estimatedBudget * 0.4 / rooms);
    }
    if (kitchen > 0) { componentLabels.push("Kitchen"); componentData.push(kitchen * 50000); }
    if (baths > 0) { componentLabels.push("Bathroom"); componentData.push(baths * 40000); }
    if (sitout > 0) { componentLabels.push("Sitout"); componentData.push(sitout * 30000); }

    if (floorChartInstance) floorChartInstance.destroy();
    if (roomChartInstance) roomChartInstance.destroy();

    floorChartInstance = new Chart(floorCtx, {
      type: "pie",
      data: { labels: floorLabels, datasets: [{ data: floorData, backgroundColor: ["#28a745", "#198754"] }] },
      options: {
        responsive: true,
        plugins: {
          legend: { position: "bottom" },
          tooltip: { callbacks: { label: function(context){ return `${context.label}: ₹${context.raw.toLocaleString()}`; } } },
          title: { display: true, text: "Budget Distribution by Floor", font: { size: 16, weight: "bold" } }
        }
      }
    });

    roomChartInstance = new Chart(roomCtx, {
      type: "bar",
      data: { labels: componentLabels, datasets: [{ label: "Budget Amount", data: componentData, backgroundColor: "#0d6efd" }] },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: function(context){ return `₹${context.raw.toLocaleString()}`; } } },
          title: { display: true, text: "Budget per Room / Component", font: { size: 16, weight: "bold" } }
        },
        scales: { y: { beginAtZero: true } }
      }
    });
  }

  // --- Chatbot logic ---
  const chatBubble = document.getElementById("chatbot-bubble");
  const chatContainer = document.getElementById("chatbot-container");
  const closeChat = document.getElementById("closeChat");
  const sendBtn = document.getElementById("sendBtn");
  const chatBody = document.getElementById("chatBody");
  const userInput = document.getElementById("userInput");

  chatBubble.addEventListener("click", () => { chatContainer.style.display = "flex"; chatBubble.style.display = "none"; });
  closeChat.addEventListener("click", () => { chatContainer.style.display = "none"; chatBubble.style.display = "flex"; });
  sendBtn.addEventListener("click", sendMessage);
  userInput.addEventListener("keypress", (e) => { if (e.key === "Enter") sendMessage(); });

  function sendMessage() {
    const msg = userInput.value.trim();
    if (!msg) return;

    const userMsg = document.createElement("div");
    userMsg.classList.add("user-msg");
    userMsg.textContent = msg;
    chatBody.appendChild(userMsg);

    userInput.value = "";

    setTimeout(() => {
      const botMsg = document.createElement("div");
      botMsg.classList.add("bot-msg");
      botMsg.textContent = "🤖 I'm learning! Soon I'll give design & cost insights in real-time.";
      chatBody.appendChild(botMsg);
      chatBody.scrollTop = chatBody.scrollHeight;
    }, 800);

    chatBody.scrollTop = chatBody.scrollHeight;
  }

  // --- 2D Blueprint Drawing with budget overlay ---
  function drawBlueprint(floorsValue, rooms1, kitchen1, baths1, sitout1, rooms2=0, kitchen2=0, baths2=0, sitout2=0, estimatedBudget=0) {
    const canvas = document.getElementById("blueprintCanvas");
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const floorHeight = 150;
    const roomWidth = 80;
    const padding = 50;
    ctx.font = "14px Arial";
    ctx.textAlign = "center";

    function drawFloor(yOffset, rooms, kitchen, baths, sitout, floorNum) {
      let totalRooms = rooms + kitchen + baths + sitout;
      let roomBudget = totalRooms ? estimatedBudget / totalRooms : 0;

      for (let i = 0; i < rooms; i++) {
        ctx.fillStyle = "#0d6efd";
        ctx.fillRect(padding + i * roomWidth, yOffset, roomWidth - 5, floorHeight - 20);
        ctx.fillStyle = "#fff";
        ctx.fillText(`Room ${i+1}`, padding + i * roomWidth + roomWidth/2 - 2, yOffset + 25);
        ctx.fillText(`₹${Math.floor(roomBudget).toLocaleString()}`, padding + i * roomWidth + roomWidth/2 - 2, yOffset + 50);
      }
      if (kitchen) {
        ctx.fillStyle = "#ffa500";
        ctx.fillRect(padding + rooms * roomWidth, yOffset, roomWidth, floorHeight / 2 - 10);
        ctx.fillStyle = "#fff";
        ctx.fillText("Kitchen", padding + rooms * roomWidth + roomWidth/2 - 2, yOffset + 20);
        ctx.fillText(`₹${Math.floor(roomBudget).toLocaleString()}`, padding + rooms * roomWidth + roomWidth/2 - 2, yOffset + 40);
      }
      if (baths) {
        ctx.fillStyle = "#ff4500";
        ctx.fillRect(padding + rooms * roomWidth, yOffset + floorHeight / 2, roomWidth, floorHeight / 2 - 10);
        ctx.fillStyle = "#fff";
        ctx.fillText("Bathroom", padding + rooms * roomWidth + roomWidth/2 - 5, yOffset + floorHeight / 2 + 20);
        ctx.fillText(`₹${Math.floor(roomBudget).toLocaleString()}`, padding + rooms * roomWidth + roomWidth/2 - 2, yOffset + floorHeight / 2 + 40);
      }
      if (sitout) {
        ctx.fillStyle = "#6f42c1";
        ctx.fillRect(padding - roomWidth, yOffset, roomWidth, floorHeight - 20);
        ctx.fillStyle = "#fff";
        ctx.fillText("Sitout", padding - roomWidth / 2, yOffset + 25);
        ctx.fillText(`₹${Math.floor(roomBudget).toLocaleString()}`, padding - roomWidth / 2, yOffset + 50);
      }
      ctx.fillStyle = "#000";
      ctx.fillText(`Floor ${floorNum}`, canvas.width - 60, yOffset + floorHeight / 2);
    }

    drawFloor(20, rooms1, kitchen1, baths1, sitout1, 1);
    if (floorsValue === 2) drawFloor(200, rooms2, kitchen2, baths2, sitout2, 2);
  }

  // --- Generate Another Button Logic ---
  const generateBtn = document.createElement("button");
  generateBtn.textContent = "Generate Another";
  generateBtn.className = "btn btn-outline-success mt-3";
  document.getElementById("design").appendChild(generateBtn);

  generateBtn.addEventListener("click", () => {
    // Random floor & room numbers for demo
    const floorsValue = Math.floor(Math.random() * 2) + 1;
    const rooms1 = Math.floor(Math.random() * 4) + 1;
    const kitchen1 = Math.floor(Math.random() * 2);
    const baths1 = Math.floor(Math.random() * 2);
    const sitout1 = Math.floor(Math.random() * 2);
    const rooms2 = floorsValue === 2 ? Math.floor(Math.random() * 4) + 1 : 0;
    const kitchen2 = floorsValue === 2 ? Math.floor(Math.random() * 2) : 0;
    const baths2 = floorsValue === 2 ? Math.floor(Math.random() * 2) : 0;
    const sitout2 = floorsValue === 2 ? Math.floor(Math.random() * 2) : 0;
    const estimatedBudget = Math.floor(Math.random() * 5000000) + 1000000;

    drawBlueprint(floorsValue, rooms1, kitchen1, baths1, sitout1, rooms2, kitchen2, baths2, sitout2, estimatedBudget);
  });

});
