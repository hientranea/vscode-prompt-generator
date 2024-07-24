(function() {
    const vscode = acquireVsCodeApi();

    let templates = [];

    window.addEventListener('message', event => {
        const message = event.data;
        console.log('Received message:', message);
        switch (message.type) {
            case 'update':
                templates = message.templates;
                updateTemplateList();
                break;
        }
    });

    function updateTemplateList() {
        console.log('Updating template list');
        const list = document.getElementById('template-list');
        list.innerHTML = '';
        templates.forEach((template, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <input type="text" value="${template.name}" onchange="updateTemplate(${index}, 'name', this.value)">
                <textarea onchange="updateTemplate(${index}, 'template', this.value)">${template.template}</textarea>
                <button onclick="deleteTemplate(${index})">Delete</button>
            `;
            list.appendChild(li);
        });
    }

    window.addTemplate = function() {
        console.log('Adding new template');
        templates.push({ name: 'New Template', template: '{content}' });
        vscode.postMessage({ type: 'update', templates });
    }

    window.updateTemplate = function(index, field, value) {
        console.log(`Updating template ${index}, field ${field}`);
        templates[index][field] = value;
        vscode.postMessage({ type: 'update', templates });
    }

    window.deleteTemplate = function(index) {
        console.log(`Deleting template ${index}`);
        templates.splice(index, 1);
        vscode.postMessage({ type: 'update', templates });
    }

    document.getElementById('add-template').addEventListener('click', () => {
        console.log('Add template button clicked');
        addTemplate();
    });

    vscode.postMessage({ type: 'getTemplates' });
    console.log('Requested initial templates');
})();
