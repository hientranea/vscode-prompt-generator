(function () {
  const vscode = acquireVsCodeApi();

  let data = { templates: [], additionalIgnoreRules: [] };
  let currentTab = "templates";
  let selectedTemplateIndex = -1;

  // Initialize the editor
  function init() {
    vscode.postMessage({ type: "getData" });
    switchTab("templates");
  }

  // Update the template list in the sidebar
  function updateTemplateList() {
    const sidebar = document.getElementById("sidebar");
    sidebar.innerHTML = "";
    data.templates.forEach((template, index) => {
      const div = document.createElement("div");
      div.className = "template-item";
      if (index === selectedTemplateIndex) {
        div.classList.add("selected");
      }
      div.innerHTML = `
        <span class="template-name">${escapeHtml(template.name)}</span>
        <span class="delete-icon" data-index="${index}">X</span>
      `;
      div.addEventListener("click", () => selectTemplate(index));
      div.querySelector(".delete-icon").addEventListener("click", (event) => {
        event.stopPropagation();
        deleteTemplate(index);
      });
      sidebar.appendChild(div);
    });
    const addButton = document.createElement("button");
    addButton.id = "add-template-button";
    addButton.textContent = "Create New Template";
    addButton.onclick = addTemplate;
    sidebar.appendChild(addButton);
  }

  // Update the main area content based on the current tab and selection
  function updateMainArea() {
    const main = document.getElementById("main");
    main.innerHTML = "";

    if (currentTab === "templates") {
      if (selectedTemplateIndex !== -1) {
        const template = data.templates[selectedTemplateIndex];
        main.innerHTML = `
          <form id="template-form">
            <input type="text" id="templateName" value="${escapeHtml(template.name)}" placeholder="Enter template name">
            <textarea id="templateContent" placeholder="Enter template content">${escapeHtml(template.template)}</textarea>
            <button type="submit">Save Changes</button>
          </form>
        `;
        document.getElementById("template-form").onsubmit = (e) => {
          e.preventDefault();
          saveTemplate();
        };

        const textarea = document.getElementById("templateContent");
        textarea.addEventListener("input", autoExpandTextarea);
        autoExpandTextarea.call(textarea);
      } else {
        main.innerHTML = "<p>Select a template from the sidebar or add a new one.</p>";
      }
    } else {
      main.innerHTML = `
              <h2>Ignore Rules</h2>
              <p class="subtitle">
                The extension respects your project's .gitignore file by default. You can add additional ignore rules below to further customize file selection.
              </p>
              <div id="ignore-rules-container">
                  <div id="ignore-rules-list"></div>
                  <div class="add-rule-container">
                      <input type="text" id="new-ignore-rule" placeholder="Enter new ignore rule">
                      <button onclick="addIgnoreRule()">Add Rule</button>
                  </div>
              </div>
          `;
      updateIgnoreRuleList();
    }
  }

  function autoExpandTextarea() {
    this.style.height = "auto";
    this.style.height = this.scrollHeight + "px";
  }

  // Update the ignore rule list
  function updateIgnoreRuleList() {
    const ignoreRuleList = document.getElementById("ignore-rules-list");
    ignoreRuleList.innerHTML = "";
    data.additionalIgnoreRules.forEach((rule, index) => {
      const li = document.createElement("div");
      li.className = "ignore-rule-item";
      li.innerHTML = `
              <input type="text" value="${escapeHtml(rule)}" placeholder="Ignore Rule" oninput="updateIgnoreRule(${index}, this.value)">
              <button class="delete-btn" onclick="deleteIgnoreRule(${index})">Remove</button>
          `;
      ignoreRuleList.appendChild(li);
    });
  }

  // Save the current template
  function saveTemplate() {
    const name = document.getElementById("templateName").value;
    const content = document.getElementById("templateContent").value;
    data.templates[selectedTemplateIndex] = { name, template: content };
    updateTemplateList();
    saveChanges();
  }

  // Save changes to VS Code extension
  function saveChanges() {
    vscode.postMessage({ type: "update", data });
  }

  // Switch between tabs
  window.switchTab = (tab) => {
    currentTab = tab;
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    document
      .querySelector(`.tab:nth-child(${tab === "templates" ? 1 : 2})`)
      .classList.add("active");
    document.getElementById("sidebar").style.display = tab === "templates" ? "block" : "none";
    updateMainArea();
  };

  // Select a template
  window.selectTemplate = (index) => {
    selectedTemplateIndex = index;
    updateTemplateList(); // Add this line to update the selected state in the sidebar
    updateMainArea();
  };

  // Delete a template
  window.deleteTemplate = (index) => {
    data.templates.splice(index, 1);
    if (selectedTemplateIndex === index) {
      selectedTemplateIndex = -1;
    } else if (selectedTemplateIndex > index) {
      selectedTemplateIndex--;
    }
    updateTemplateList();
    updateMainArea();
    saveChanges();
  };

  // Add a new template
  window.addTemplate = () => {
    data.templates.push({ name: "New Template", template: "{content}" });
    selectedTemplateIndex = data.templates.length - 1;
    updateTemplateList();
    updateMainArea();
    saveChanges();
  };

  // Add a new ignore rule
  window.addIgnoreRule = () => {
    const newRuleInput = document.getElementById("new-ignore-rule");
    const newRule = newRuleInput.value.trim();
    if (newRule) {
      data.additionalIgnoreRules.push(newRule);
      newRuleInput.value = "";
      updateIgnoreRuleList();
      saveChanges();
    }
  };

  // Update an ignore rule
  window.updateIgnoreRule = (index, value) => {
    data.additionalIgnoreRules[index] = value;
    saveChanges();
  };

  // Delete an ignore rule
  window.deleteIgnoreRule = (index) => {
    data.additionalIgnoreRules.splice(index, 1);
    updateIgnoreRuleList();
    saveChanges();
  };

  // Escape HTML to prevent XSS
  function escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Listen for messages from the extension
  window.addEventListener("message", (event) => {
    const message = event.data;
    switch (message.type) {
      case "update":
        data = message.data;
        updateTemplateList();
        updateMainArea();
        break;
    }
  });

  // Initialize the editor
  init();
})();
