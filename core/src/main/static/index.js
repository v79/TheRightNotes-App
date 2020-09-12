"use strict";

/**
 * Some global definitions
 */
let gallery;
let initialGalleryElement;
let tracklist;
let spotifyToken;
let authToken;
/**
 * On document load activities to populate file list and image gallery.
 * Fetches spotify auth token
 */
document.addEventListener("DOMContentLoaded", () => {
    function loadFileList() {
        const fileListDom = document.querySelector("#file-list");

        let promise = fetch("/post-list", {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + authToken
            }
        })
            .then((response) => response.text())
            .then(data => updateElement(fileListDom, data));
    }

    // authenticate();
    loadFileList();
    loadImageGallery();
    spotifyToken = getSpotifyToken();
});

// set up authentication
function authenticate() {
    let awsAccountId = '086949310404';
    let awsRegion = 'eu-west-2';
    let cognitoClientId = 'urfqo0jeeh54d5mi1rf70cfmk';
    let apiId = 'ru93q91hc7';

    let loginUrl = `https://therightnotes-api-${awsAccountId}.auth.${awsRegion}.amazoncognito.com/login?` +
        `redirect_uri=https://api.therightnotes.org/&client_id=${cognitoClientId}&` +
        `response_type=token&scope=email+openid+phone+profile`;

    authToken = parseIdToken();
    console.log(`idToken (authToken): ${authToken}`);

    if (authToken) {
        // document.getElementById('msg').innerText = 'Logged in';
        // document.getElementById('requestButton').disabled = false;
        return;
    }
    // not logged in - redirect to login page
    console.log(`not logged in, redirecting to ${loginUrl}`);
    window.location = loginUrl;
}

function parseIdToken() {
    if (window.location.hash) {
        let hash = window.location.hash.substr(1);
        let regex = /id_token=([^&]*)/;
        let match = hash.match(regex);
        if (match) {
            return match[1];
        }
    }
    return null;
}

/**
 * Image gallery
 */

/**
 * Load JSON representing the composer portrait gallery
 * @returns JSON object containing list of composers
 */
function loadImageGallery() {
    let promise = fetch("/image-list", {
        headers: {
            'Authorization': 'Bearer ' + authToken
        }
    })
        .then((response) => {
            return response.json()
        })
        .then((data => {
            var list = data.imageList;
            buildGalleryList(list);
            gallery = list;
        }))
    return gallery;
}

/**
 * Construct HTML for the composer portrait gallery
 * @param list JSON list of composers
 */
function buildGalleryList(list) {
    const imageGalleryLoading = document.getElementById("image-gallery-loading-msg");
    const imageGalleryDom = document.querySelector("#image-gallery");

    const ul = document.createElement("ul");
    ul.id = "filtered-list"
    ul.classList.add("portrait-list");
    for (let image of list) {
        buildGalleryImage(image, ul);
    }

    // on first load, this will be null, so set it to our new list
    // we can use this to 'reset'
    if (!initialGalleryElement) {
        initialGalleryElement = ul;
    }

    if (imageGalleryLoading) {
        imageGalleryDom.replaceChild(ul, imageGalleryLoading);
    } else {
        imageGalleryDom.replaceChild(ul, document.getElementById("filtered-list"));
    }
}

/**
 * Construct the HTML list item for a single composer portrait
 * @param image JSON representing a single composer image file
 * @param ul containing UL DOMElement to attach the list item to
 */
function buildGalleryImage(image, ul) {
    var li = document.createElement("li");
    var figure = document.createElement("figure");
    figure.classList.add("image", "is-96x96", "gallery-figure");
    var img = document.createElement("img");
    img.src = image.url;
    img.title = image.filename;
    img.alt = `${image.filename} (${image.size} bytes)`;
    img.ondragstart = "dragstart_handler(event);";
    img.ondragend = "dragend_handler(event);";
    img.draggable = true;
    var figcaption = document.createElement("figcaption");
    figcaption.classList.add("is-small");
    figcaption.innerText = image.filename;
    figure.appendChild(img);
    figure.appendChild(figcaption);
    li.appendChild(figure);
    ul.appendChild(li);
}

/**
 * Action to filter the list of shown composers, based on user input. Calls searchGallery to get sub-list then rebuilds the gallery.
 * Only responds to queries of 3 or more characters.
 */
function filterGallery() {
    const searchInput = document.getElementById("composer-search").value;
    if (searchInput.length > 2) {
        let filtered = searchGallery(searchInput);
        buildGalleryList(filtered);
    } else {
        const imageGalleryDom = document.querySelector("#image-gallery");
        // change event fired, we don't have a valid search query, reset to full list
        imageGalleryDom.replaceChild(initialGalleryElement, document.getElementById("filtered-list"));
    }
}

/**
 * Search the gallery list file names for the given query
 * @param query
 * @returns foundItems sub-list of gallery items which match the query
 */
function searchGallery(query) {
    let lower = query.toLowerCase();
    let foundItems = gallery.filter(image => {
            return image.filename.toLowerCase().includes(lower);
        }
    )
    return foundItems;
}

/**
 * Drag-and-drop activities
 * @param ev the drag event
 */
function dragstart_handler(ev) {
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
    WARNING: 'warning',
    PROCESSING: 'processing'
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

/**
 * Generic error handler; if response is not OK then throw Error to be caught in the Promise
 * @param response
 * @returns {{ok}|*}
 */
function handleErrors(response) {
    console.dir(response);
    if (!response.ok) {
        throw Error(response);
    }
    return response;
}

/**
 * Load the markdown source file into the markdown editor
 * @param fileName
 */
function loadMarkdownFile(fileName) {

    popupMessage("Loading file '" + fileName + "'", "", STATUS.PROCESSING)
    tracklist = null;

    fetch("/load-markdown", {
        method: "POST", body: fileName, headers: {
            'Authorization': 'Bearer ' + authToken
        }
    }).then(response => {
        if (!response.ok) {
            throw response
        } // will be caught as 'error' below
        return response;

    })
        .then((response) => response.text())
        .then((data) => (markdownFile = updateMarkdownEditor(data, false)))
        .catch(error => {
            if (error.json) {
                error.json().then(e => {
                    popupMessage(e["summary"], e["detail"], STATUS.ERROR);
                })
            }
        })
}

function updateMarkdownEditor(data, disabled) {
    const form = document.getElementById("form-md");
    const formElements = form.elements;
    const md_textarea = document.getElementById("form-md-text");
    const releaseDraftButton = document.getElementById("btn-release-draft");
    let mdObject;
    try {
        mdObject = JSON.parse(data);
    } catch {
        console.error("Failed to parse markdown data: " + data);
        return;
    }
    formElements["form-meta-filepath"].value = mdObject.path;
    formElements["form-meta-title"].value = mdObject.title;
    formElements["form-meta-slug"].value = mdObject.slug;
    formElements["form-meta-summary"].value = mdObject.summary;
    formElements["form-meta-playlist"].value = mdObject.playlist;
    formElements["form-meta-composers"].value = mdObject.composers;
    formElements["form-meta-genres"].value = mdObject.genres;
    formElements["form-meta-layout"].value = mdObject.layout;

    // md_textarea.textContent = o.body;
    simplemde.value(mdObject.body)
    md_textarea.disabled = false;
    hide("welcome-message");
    unhide(form.id);
    let isDraft = mdObject.path.substring(mdObject.path.lastIndexOf("/") + 1).startsWith("__");
    let loadedFile = new MarkdownFile(mdObject.path, mdObject.title, isDraft);
    if (!isDraft) {
        hide("btn-release-draft");
    } else {
        unhide("btn-release-draft");
    }

    // get the track listing
    getPlaylistTracks();
    // and close modal
    closeAllModals();
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
    files = [...files];
    files.forEach(uploadFile);
    files.forEach(previewFile);
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
    // disable cancel button
    document.getElementById("btn-cancel-image-upload").disabled = true;
    // show spinner
    unhide("image-upload-spinner-span");

    fetch("/upload-image", {
        headers: {
            'Content-Type': 'image/jpeg',
            'Authorization': 'Bearer ' + authToken,
            'Content-Disposition': 'attachment; filename="' + file.name + '"'
        },
        method: "POST",
        body: file
    })
        .then((response) => {
            if (response.ok) {
                popupMessage(`Upload of image ${file.name} completed.","It has been resized and converted and will appear in\nthe Composer Portraits box`, STATUS.OK);
            } else {
                popupMessage(`Upload of image ${file.name} failed.","Please try again with a different file.`, STATUS.ERROR);
            }
        })
        .catch(() => {
            console.log("Unspecified error uploading file " + file.name);
        })
        .finally(() => {
            loadImageGallery();
            resetUploadModal();
        })
}

function previewFile(file) {
    let reader = new FileReader();
    const preview = document.getElementById("upload-preview");
    reader.readAsDataURL(file);
    reader.onloadend = function () {
        let img = document.createElement('img');
        img.src = reader.result;
        img.width = 128;
        preview.appendChild(img);
        let p = document.createElement('p');
        p.innerText = file.name;
        preview.appendChild(p);
    }
}

function resetUploadModal() {
    const previewElem = document.getElementById("upload-preview");
    while (previewElem.firstChild) {
        previewElem.firstChild.remove();
    }
    document.getElementById("btn-cancel-image-upload").disabled = false;
    hide("image-upload-spinner-span");
}

/************ */


/**
 * Spotify interactions
 */
function getSpotifyToken() {
    let promise = fetch("/spotify-token", {
        method: "GET",
        headers: {
            'Accept': 'text/plain',
            'Authorization': 'Bearer ' + authToken
        }
    }).then((response) => {
        return response.text();
    })
        .then((data) => {
            spotifyToken = data
        });
}

function toggleTrackList() {
    const dropdownElement = document.getElementById("tracks-list-dropdown");
    dropdownElement.classList.toggle("is-active");
}


function getPlaylistTracks() {
    const trackListingDiv = document.getElementById("track-listing-container");
    const playlistId = document.getElementById("form-meta-playlist").value;

    console.log("Fetching playlist tracks for " + playlistId + " with auth token: " + spotifyToken);
    let fetchUrl = `https://api.spotify.com/v1/playlists/${playlistId}/tracks`;
    let promise = fetch(fetchUrl, {
        method: "GET",
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${spotifyToken}`
        }
    }).then((response) => {
        return response.json();
    })
        .then((data => {
            tracklist = data.items;
            buildTrackListing(trackListingDiv, tracklist)
        }));
}

function buildTrackListing(trackListingDiv, trackItems) {
    const newTrackListingDiv = document.createElement("div");
    const oldListing = document.getElementById("tmp-track-listing");

    newTrackListingDiv.id = "tmp-track-listing";
    for (let trackItem of trackItems) {
        let track = trackItem.track;
        let trackCode = track.id;
        let trackName = track.name;
        let trackItemDiv = document.createElement("div");
        trackItemDiv.classList.add("dropdown-item");
        let label = document.createElement("span");
        label.innerText = `${trackName}`;
        trackItemDiv.appendChild(label);
        let trackItemSpan = document.createElement("span");
        trackItemSpan.id = `track-id-${trackCode}`;
        let trackItemInput = document.createElement("input");
        // trackItemInput.name = `track-name-${trackCode}`;
        trackItemInput.id = `track-name-${trackCode}`;
        trackItemInput.classList.add("is-pulled-right", "is-small");
        trackItemInput.value = `spotify:track:${trackCode}`;
        trackItemSpan.classList.add("icon", "is-right", "mdi", "mdi-content-copy", "is-pulled-right");
        trackItemDiv.appendChild(trackItemInput);
        trackItemDiv.appendChild(trackItemSpan);
        newTrackListingDiv.appendChild(trackItemDiv);
    }
    if (typeof oldListing === 'undefined' || oldListing === null) {
        trackListingDiv.appendChild(newTrackListingDiv);
    } else {
        trackListingDiv.replaceChild(newTrackListingDiv, oldListing);
    }
    for (let dropdownItem of newTrackListingDiv.childNodes) {
        for (let item of dropdownItem.childNodes) {
            if (item.nodeName === "INPUT") {
                item.addEventListener("click", function () {
                    copyToClipboard(item.id)
                });
            }
        }
    }
}

function copyToClipboard(elementName) {
    const valueToCopy = document.getElementById(elementName);
    valueToCopy.select();
    document.execCommand("copy");
}

function generateSlug(elementToUpdate) {
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
    let playlist = formData.get("playlist");
    const playlistPrefix = "spotify:playlist:";
    if (playlist.startsWith(playlistPrefix)) {
        playlist = playlist.substring(playlistPrefix.length);
        formData.delete("playlist");
        formData.append("playlist", playlist);
    }
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
    // need to escape the summary, may contain YAML characters such as the colon, and wrap it in quotes
    let summary = formData.get("summary");
    let updatedSummary = '"' + summary + '"';
    formData.delete("summary");
    formData.append("summary", updatedSummary);

    let json = formToJson(formData);
    console.log("Posting form data...");
    console.log(json);
    let promise = fetch("/save-new-file", {
        method: "POST",
        headers: {
            'Authorization': 'Bearer ' + authToken
        },
        body: json
    }).then(response => {
        if (response.ok) {
            popupMessage(`File created successfully`, "", STATUS.OK);
        } else {
            popupMessage(`Error creating file`, "", STATUS.ERROR);
            console.log("Error creating file " + response.status);
        }
    }).finally((() => newFileWizard.clear()));
    //.finally((data) => window.location.replace("/"));
}

function releaseDraft() {
    console.log("Attempting to release draft file " + markdownFile.filename + " which is draft: " + markdownFile.isDraft);
    let promise = fetch("/release-from-draft", {
        method: "POST",
        body: markdownFile.filename,
        headers: {
            'Authorization': 'Bearer ' + authToken
        }
    }).finally((data) => window.location.replace("/"));
}

function saveAndUpdate() {
    popupMessage("Saving...", "", STATUS.PROCESSING);
    let mdeContent = simplemde.value();
    let form = document.getElementById("form-md");
    let formData = new FormData(form);
    formData.append("body", mdeContent);
    formData.append("slug", document.getElementById("form-meta-slug").value);
    formData.append("layout", document.getElementById("form-meta-layout").value);
    // wrap the summary in quotes
    let summary = formData.get("summary");
    let updatedSummary = '"' + summary + '"';
    formData.delete("summary");
    formData.append("summary", updatedSummary);
    let formJson = formToJson(formData);
    let promise = fetch("/save-and-update", {
        method: "POST",
        headers: {
            'Authorization': 'Bearer ' + authToken
        },
        body: formJson
    }).then((response) => {
        return response.json();
    }).then((data) => {
        if (data.status === 200 || data.status === 201) {
            popupMessage("Saved changes to " + markdownFile.title, "", STATUS.OK);
        } else {
            popupMessage("There was a problem saving '" + markdownFile.title + "'.", "Please try again later.\nError message was:\n" + data.message, STATUS.ERROR);
        }
    }).catch((error) => {
        console.log("SaveAndUpdate error: " + error);
        popupMessage("There was an unspecified problem saving\n" + markdownFile.title + ",", "please try again later.\n" + error.message, STATUS.ERROR);
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

function popupMessage(messageText, messageDetail, status) {
    closeAllModals()
    const modal = document.getElementById("generic-info-modal");
    const message = document.getElementById("generic-modal-message");
    const detail = document.getElementById("generic-modal-detail");
    const statusIcon = document.getElementById("generic-modal-status");
    message.innerText = messageText;
    detail.innerText = messageDetail;
    let statusClass = [];
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
        case STATUS.PROCESSING: {
            statusClass = ["mdi-spin", "mdi-autorenew", "has-text-info"]
            break;
        }
        default:
            break;
    }
    statusIcon.classList.value = ["mdi", "is-size-3", ...statusClass].join(" ");
    showModal(modal);
}

function closeAllModals() {
    let existingModals = document.querySelectorAll(".modal");
    for (let existingModal of existingModals) {
        closeModal(existingModal.id);
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
    // console.log(JSON.stringify(object));
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
