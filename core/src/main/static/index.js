"use strict";
/**
 * On document load activities to populate file list and image gallery
 */
document.addEventListener("DOMContentLoaded", () => {
    function loadFileList() {
        const fileListDom = document.querySelector("#file-list");

        let promise = fetch("/post-list")
            .then((response) => response.text())
            .then(data => updateElement(fileListDom, data));
    }

    function loadImageGallery() {
        const imageGalleryDom = document.querySelector("#image-gallery");

        let promise = fetch("/image-list")
            .then((response) => response.text())
            .then(data => updateElement(imageGalleryDom, data));
    }

    loadFileList();
    loadImageGallery();


});


/**
 * Drag-and-drop activities
 * @param ev the drag event
 */
function dragstart_handler(ev) {
    console.log("dragStart " + JSON.stringify(ev));
    // Change the source element's background color to signify drag has started
    // Add the id of the drag source element to the drag data payload so
    // it is available when the drop event is fired
    var dt = ev.dataTransfer;
    dt.setData("text/uri-list", ev.target.src);
    // Tell the browser both copy and move are possible
    ev.effectAllowed = "link";
}

function dragover_handler(ev) {
    // Change the target element's border to signify a drag over event
    // has occurred
    ev.currentTarget.style.background = "lightblue";
    ev.preventDefault();
}

function drop_handler(ev) {
    ev.preventDefault();
    // Get the id of drag source element (that was added to the drag data
    // payload by the dragstart event handler)
    var id = ev.dataTransfer.getData("text/uri-list");
    ev.target.style.background = "";
    ev.target.innerText = id;
}

function dragend_handler(ev) {
    // Restore source's border
    // Remove all of the drag data
    ev.dataTransfer.clearData();
}

/**
 * Enums
 */
const STATUS = {
    OK: 'ok',
    ERROR: 'error',
    WARNING: 'warning'
}

/**
 * Definition of a wizard page, identified as a <fieldset>
 */
class WizardPage {
    constructor(id, fieldset) {
        this.id = id;
        this.fieldset = document.getElementById(fieldset);
        this.fields = this.fieldset.elements;
    }

    validate() {
        let valid = true;
        for (let f of this.fields) {
            const validatorFunction = f.getAttribute("data-validator");
            if (validatorFunction) {
                valid = eval(validatorFunction);
            }
        }
        return valid;
    }
}

/**
 * Validation functions
 * @returns true if valid
 */
function validate_newPostForm_title() {
    let valid = true;
    const formElement = document.getElementById("new-post-title");
    let messageElement = formElement.nextElementSibling;
    if (formElement.value === null || formElement.value.length === 0) {
        valid = false;
        showError(messageElement, "A title is required")
    } else {
        clearError(messageElement);
    }
    return valid;
}

function validate_newPostForm_genres() {
    let valid = true;
    const formElement = document.getElementById("new-post-genres");
    let messageElement = formElement.nextElementSibling;
    if (formElement.value === null || formElement.value.length === 0) {
        valid = false;
        showError(messageElement, "Genres are required")
    } else {
        clearError(messageElement);
    }
    return valid;
}

function validate_newPostForm_composers() {
    let valid = true;
    const formElement = document.getElementById("new-post-composers");
    let messageElement = formElement.nextElementSibling;
    if (formElement.value === null || formElement.value.length === 0) {
        valid = false;
        showError(messageElement, "Composers are required")
    } else {
        clearError(messageElement);
    }
    return valid;
}

/**
 * General error methods for validators
 * @param element
 * @param errorMessage
 */
function showError(element, errorMessage) {
    element.classList.remove("is-hidden");
    element.classList.add("has-text-danger");
    element.innerHTML = errorMessage;
}

function clearError(element) {
    element.classList.remove("has-text-danger");
    element.classList.add("is-hidden");
}

/**
 * Class representing a multi-step modal dialog which will contain multiple {pages}
 */
class ModalWizard {
    constructor(id, pages, formName, prevButton, nextButton, lastButton) {
        this.id = id;
        this.pages = pages;
        this.currentPage = 0;
        this.formName = formName;
        this.pageCount = this.pages.length - 1;
        this.prevButton = prevButton;
        this.nextButton = nextButton;
        this.lastButton = lastButton;
        hide(prevButton);
    }

    nextPage() {
        let valid = this.pages[this.currentPage].validate();
        if (valid) {
            if (this.currentPage < this.pageCount) {
                let nextPage = this.pages[this.currentPage + 1];
                let prevPage = this.pages[this.currentPage];
                hide(prevPage.fieldset.id);
                unhide(nextPage.fieldset.id);
                unhide(this.prevButton);
                this.currentPage++;
                if (this.currentPage === this.pageCount) {
                    hide(this.nextButton);
                    unhide(this.lastButton);
                }
                if (this.currentPage !== this.pageCount) {
                    hide(this.lastButton);
                }
            }
        } else {
            // not moving on?
        }
    }

    prevPage() {
        console.log("Prev clicked: on " + this.currentPage + " of " + this.pageCount);
        if (this.currentPage <= this.pageCount) {
            let nextPage = this.pages[this.currentPage];
            let prevPage = this.pages[this.currentPage - 1];
            hide(nextPage.fieldset.id);
            unhide(prevPage.fieldset.id);
            unhide(this.nextButton);
            this.currentPage--;
            if (this.currentPage === this.pageCount) {
                hide(this.prevButton);
                hide(this.lastButton)
                unhide(this.nextButton);
            }
            if (this.currentPage === 0) {
                hide(this.prevButton);
            }
            if (this.currentPage !== this.pageCount) {
                hide(this.lastButton);
            }
        }
    }

    clear() {
        let containingForm = document.getElementById(this.formName);
        for (let formItem of containingForm.elements) {
            formItem.value = null;
        }
        this.currentPage = 0;
        for (let page of this.pages) {
            console.log("Hiding page " + page.id);
            hide(page.id);
        }
        unhide(this.pages[this.currentPage].fieldset.id);
        hide(this.lastButton);
        hide(this.prevButton);
        unhide(this.nextButton);
    }
}

function newFileWizardNext() {
    newFileWizard.nextPage();
}

function newFileWizardPrev() {
    newFileWizard.prevPage();
}

/**
 * Class definition representing a Page/Post, populated on load
 */
class MarkdownFile {
    // for start
    constructor(filename, title, isDraft) {
        this.filename = filename;
        this.title = title;
        this.isDraft = isDraft;
    }
}



/**
 * Global data set up
 */
let newPostBasics = new WizardPage("new-post-basics", "new-post-basics");
let newPostSummary = new WizardPage("new-post-summary-and-spotify", "new-post-summary-and-spotify");
let newPostTags = new WizardPage("new-post-tags", "new-post-tags");
let newPostBodyText = new WizardPage("new-post-bodytext", "new-post-bodytext");
let newFileWizard = new ModalWizard("new-post-modal", [newPostBasics, newPostSummary, newPostTags, newPostBodyText], "new-post-form", "new-post-btn-prev", "new-post-btn-next", "new-post-btn-save");
var markdownFile = null;
const dropArea = document.getElementById("image-upload-drop-area");


/**
 * button actions
 */
function loadMarkdownFile(fileName) {
    let promise = fetch("/load-markdown", {method: "POST", body: fileName})
        .then((response) => response.text())
        .then((data) => (markdownFile = updateMarkdownEditor(data, false)));
}

function updateMarkdownEditor(data, disabled) {
    const form = document.getElementById("form-md");
    const formElements = form.elements;
    const md_textarea = document.getElementById("form-md-text");
    var o = JSON.parse(data);

    formElements["form-meta-filepath"].value = o.path;
    formElements["form-meta-title"].value = o.title;
    formElements["form-meta-slug"].value = o.slug;
    formElements["form-meta-summary"].value = o.summary;
    formElements["form-meta-playlist"].value = o.playlist;
    formElements["form-meta-composers"].value = o.composers;
    formElements["form-meta-genres"].value = o.genres;

    // md_textarea.textContent = o.body;
    simplemde.value(o.body)
    md_textarea.disabled = false;
    hide("welcome-message");
    unhide(form.id);
    let isDraft = o.filename.substring(o.filename.lastIndexOf("/") + 1).startsWith("_");
    let loadedFile = new MarkdownFile(o.filename, o.title, isDraft);
    return loadedFile;
}

function newFile() {
    newFileWizard.clear();
    const newPostModal = document.getElementById("new-post-modal");
    newPostModal.classList.add("is-active");
}

/** image upload - make a class out of this? */
function uploadPortrait() {
    const uploadPortraitModal = document.getElementById("image-upload-modal");
    uploadPortraitModal.classList.add("is-active");

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });

    dropArea.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        let dt = e.dataTransfer;
        let files = dt.files;

        handleFiles(files);
    }
}

function handleFiles(files) {
    ([...files]).forEach(uploadFile);
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function highlight(e) {
    dropArea.classList.add("highlight");
}

function unhighlight(e) {
    dropArea.classList.remove("highlight");
}

function uploadFile(file) {
    fetch("/upload-image", {
        headers: {
            'Content-Type': 'image/jpeg',
            'Content-Disposition': 'attachment; filename="' + file.name + '"'
        },
        method: "POST",
        body: file
    })
        .then(() => {  console.log("File uploaded!")/* Done. Inform the user */
        })
        .catch(() => { console.log("File upload failed!") /* Error. Inform the user */
        })
}

/************ */


function generateSlug(elementToUpdate) {
    console.log("Generating slug");
    const newFormTitle = document.getElementById("new-post-title");
    const newFormSlug = document.getElementById("new-post-slug");
    var title = newFormTitle.value;
    var slug = title.toLocaleLowerCase().replace(/\W/g, "-");
    newFormSlug.value = slug;
    document.getElementById(elementToUpdate).innerText = slug;
}

function saveNewFile(newPostForm) {

    let form = document.getElementById(newPostForm);
    let formData = new FormData(form);
    let genres = formData.get("genres[]");
    let updatedGenres = genres.split(",");
    formData.delete("genres[]");
    for (let genr of updatedGenres) {
        formData.append("genres[]", genr)
    }
    let composers = formData.get("composers[]");
    let updatedComposers = composers.split(",");
    formData.delete("composers[]");
    for (let comp of updatedComposers) {
        formData.append("composers[]", comp)
    }
    let json = formToJson(formData);
    let promise = fetch("/save-new-file", {
        method: "POST",
        body: json
    }).then(response => {
        if (response.ok) {
            popupMessage(`File created successfully`, STATUS.OK);
        } else {
            popupMessage(`Error creating file`, STATUS.ERROR);
            console.log("Error creating file " + response.status);
        }
    }).finally((() => newFileWizard.clear()));
    //.finally((data) => window.location.replace("/"));
}

function releaseDraft() {
    console.log("Attempting to release draft file " + markdownFile.filename + " which is draft: " + markdownFile.isDraft);
    let promise = fetch("/release-from-draft", {
        method: "POST",
        body: markdownFile.filename
    }).finally((data) => window.location.replace("/"));
}

function saveAndUpdate() {
    console.log("Saving and Updating...");
    let mdeContent = simplemde.value();
    let form = document.getElementById("form-md");
    let formData = new FormData(form);
    formData.append("body", mdeContent);
    formData.append("slug", document.getElementById("form-meta-slug").value);
    let formJson = formToJson(formData);
    let promise = fetch("/save-and-update", {
        method: "POST",
        body: formJson
    });
}

/**
 * General DOM helper methods
 */
function updateElement(domElement, html) {
    domElement.innerHTML = html;
}

/**
 * Hide an element with the given ID (will getElementById)
 * @param elementId
 */
function hide(elementId) {
    const domElement = document.getElementById(elementId);
    if (domElement) {
        domElement.classList.add("is-hidden");
    }
}

/**
 * Hide (show) an element with the given ID (will getElementById)
 * @param elementId
 */
function unhide(elementId) {
    const domElement = document.getElementById(elementId);
    if (domElement) {
        domElement.classList.remove("is-hidden");
    }
}

function showModal(modal) {
    modal.classList.add("is-active");
}

function closeModal(modalName) {
    let element = document.getElementById(modalName);
    element.classList.remove("is-active");
}

function popupMessage(messageText, status) {
    let existingModals = document.querySelectorAll(".modal");
    for (let existingModal of existingModals) {
        closeModal(existingModal.id);
    }
    const modal = document.getElementById("generic-info-modal");
    const message = document.getElementById("generic-modal-message");
    const statusIcon = document.getElementById("generic-modal-status");
    message.innerText = messageText;
    let statusClass;
    switch (status) {
        case STATUS.ERROR: {
            statusClass = ["mdi-alert-octagon", "has-text-danger"];
            break;
        }
        case STATUS.OK: {
            statusClass = ["mdi-check", "has-text-success"];
            break;
        }
        case STATUS.WARNING: {
            statusClass = ["mdi-alert-circle-outline", "has-text-warning"];
            break;
        }
        default:
            break;
    }
    statusIcon.classList.add("mdi", "is-size-3", ...statusClass);
    console.log(status + ", " + messageText);
    showModal(modal);
}


/**
 * Transform the formData object into a JSON string. Fields whose names end in [] are treated as an Array, even if there's only a single value
 * @param formData
 * @returns Json {string}
 */
function formToJson(formData) {
    var object = {};
    formData.forEach((value, key) => {
        if (key.endsWith("[]")) {
            if (!object[key]) {
                object[key] = [value];
            } else {
                object[key].push(value);
            }
        } else {
            // Reflect.has in favor of: object.hasOwnProperty(key)
            if (!Reflect.has(object, key)) {
                object[key] = value;
                return;
            }
            if (!Array.isArray(object[key])) {
                object[key] = [object[key]];
            }
            object[key].push(value);
        }
    });
    console.log(JSON.stringify(object));
    return JSON.stringify(object);
}

/**
 * Add project-specific markdown to the text editor
 * @param cm codeMirror instance
 * @param active
 * @param startEnd  array of the string elements to insert; the cursor will be placed between the 'start' and 'end' elements
 * @param url
 */
function createCustomMarkdown(cm, active, startEnd, url) {
    if (/editor-preview-active/.test(cm.getWrapperElement().lastChild.className))
        return;

    var text;
    var start = startEnd[0];
    var end = startEnd[1];
    var startPoint = cm.getCursor("start");
    var endPoint = cm.getCursor("end");
    if (url) {
        end = end.replace("#url#", url);
    }
    if (active) {
        text = cm.getLine(startPoint.line);
        start = text.slice(0, startPoint.ch);
        end = text.slice(startPoint.ch);
        cm.replaceRange(start + end, {
            line: startPoint.line,
            ch: 0
        });
    } else {
        text = cm.getSelection();
        cm.replaceSelection(start + text + end);

        startPoint.ch += start.length;
        if (startPoint !== endPoint) {
            endPoint.ch += start.length;
        }
    }
    cm.setSelection(startPoint, endPoint);
    cm.focus();
}

function createSpotifyLinks() {
    unhide('create-spotify-links-modal');
}
