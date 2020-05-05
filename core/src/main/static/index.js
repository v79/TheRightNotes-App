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
 * Definition of a wizard page, identified as a <fieldset>
 */
class WizardPage {
    constructor(fieldset) {
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
    constructor(id, pages, container, prevButton, nextButton, lastButton) {
        this.id = id;
        this.pages = pages;
        this.currentPage = 0;
        this.container = container;
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
                show(nextPage.fieldset.id);
                show(this.prevButton);
                this.currentPage++;
                if (this.currentPage === this.pageCount) {
                    hide(this.nextButton);
                    show(this.lastButton);
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
            show(prevPage.fieldset.id);
            show(this.nextButton);
            this.currentPage--;
            if (this.currentPage === this.pageCount) {
                hide(this.prevButton);
                hide(this.lastButton)
                show(this.nextButton);
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
        for (let form of this.container.elements) {
            form.value = null;
        }
    }
}

function closeModal(modal) {
    const toClose = document.getElementById(modal)
    toClose.classList.remove("is-active");
    newFileWizard.clear();
    // newFileWizard_CurrentPage = 0;
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
 * Data set up
 */
let newPostBasics = new WizardPage("new-post-basics");
let newPostSummary = new WizardPage("new-post-summary-and-spotify");
let newPostTags = new WizardPage("new-post-tags");
let newPostBodyText = new WizardPage("new-post-bodytext");
let newFileWizard = new ModalWizard("new-post-modal", [newPostBasics, newPostSummary, newPostTags, newPostBodyText], "new-post-modal", "new-post-btn-prev", "new-post-btn-next", "new-post-btn-save");

var markdownFile = null;

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
    show(form.id);
    let isDraft = o.filename.substring(o.filename.lastIndexOf("/")+1).startsWith("_");
    let loadedFile = new MarkdownFile(o.filename, o.title,isDraft);
    return loadedFile;
}

function newFile() {
    const newPostModal = document.getElementById("new-post-modal");
    newPostModal.classList.add("is-active");
}

function uploadPortrait() {
    const uploadPortraitModal = document.getElementById("image-upload-modal");
    uploadPortraitModal.classList.add("is-active");
}

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
    }).finally((data) => window.location.replace("/"));
}

function releaseDraft() {
    console.log("Attempting to release draft file " + markdownFile.filename + " which is draft: " + markdownFile.isDraft);
    let promise = fetch("/release-from-draft", {
        method: "POST",
        body: markdownFile.filename
    }).finally((data) => window.location.replace("/"));
}

/**
 * General DOM helper methods
 */
function updateElement(domElement, html) {
    domElement.innerHTML = html;
}

function hide(element) {
    const domElement = document.getElementById(element);
    if (domElement) {
        domElement.classList.add("is-hidden");
    }
}

function show(element) {
    const domElement = document.getElementById(element);
    if (domElement) {
        domElement.classList.remove("is-hidden");
    }
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
    console.log(object);
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
    show('create-spotify-links-modal');
}
