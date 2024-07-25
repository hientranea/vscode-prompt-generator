(function() {
    const vscode = acquireVsCodeApi();

    let data = { templates: [], additionalIgnoreRules: [] };
    let hasUnsavedChanges = false;

    function updateTemplateList() {
        const templateList = document.getElementById('template-list');
        templateList.innerHTML = '';
        data.templates.forEach((template, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <input type="text" value="${template.name}" placeholder="Template Name" oninput="markUnsavedChanges()">
                <textarea rows="3" placeholder="Template Content" oninput="markUnsavedChanges()">${template.template}</textarea>
                <button onclick="deleteTemplate(${index})">Delete</button>
            `;
            templateList.appendChild(li);5
        });
    }

    function updateIgnoreRuleList() {
        const ignoreRuleList = document.getElementById('ignore-rule-list');
        ignoreRuleList.innerHTML = '';
        data.additionalIgnoreRules.forEach((rule, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <input type="text" value="${rule}" placeholder="Ignore Rule" oninput="markUnsavedChanges()">
                <button onclick="deleteIgnoreRule(${index})">Delete</button>
            `;
            ignoreRuleList.appendChild(li);
        });
    }

    window.markUnsavedChanges = () => {
        hasUnsavedChanges = true;
        document.getElementById('save-button').disabled = false;
    };

    window.saveChanges = () => {
        const templateInputs = document.querySelectorAll('#template-list li');
        data.templates = Array.from(templateInputs).map(li => ({
            name: li.querySelector('input').value,
            template: li.querySelector('textarea').value
        }));

        const ignoreRuleInputs = document.querySelectorAll('#ignore-rule-list li input');
        data.additionalIgnoreRules = Array.from(ignoreRuleInputs).map(input => input.value);

        vscode.postMessage({ type: 'update', data });
        hasUnsavedChanges = false;
        document.getElementById('save-button').disabled = true;
    };

    document.getElementById('add-template').addEventListener('click', () => {
        data.templates.push({ name: '', template: '' });
        updateTemplateList();
        markUnsavedChanges();
    });

    document.getElementById('add-ignore-rule').addEventListener('click', () => {
        data.additionalIgnoreRules.push('');
        updateIgnoreRuleList();
        markUnsavedChanges();
    });

    window.deleteTemplate = (index) => {
        data.templates.splice(index, 1);
        updateTemplateList();
        markUnsavedChanges();
    };

    window.deleteIgnoreRule = (index) => {
        data.additionalIgnoreRules.splice(index, 1);
        updateIgnoreRuleList();
        markUnsavedChanges();
    };

    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.type) {
            case 'update':
                data = message.data;
                updateTemplateList();
                updateIgnoreRuleList();
                hasUnsavedChanges = false;
                document.getElementById('save-button').disabled = true;
                break;
        }
    });

    vscode.postMessage({ type: 'getData' });
})();
