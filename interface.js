(() => {
    const storageKey = "maison-coffee-gallery-v1";
    const galleryItems = document.querySelectorAll(".gallery-item");
    const storageStatus = document.querySelector(".gallery-status");
    const maximumCommentLength = 500;
    const maximumCommentsPerPhoto = 100;
    let storageAvailable = true;
    let galleryState = {};

    if (!galleryItems.length || !storageStatus) {
        return;
    }

    function showStorageMessage(message) {
        storageStatus.textContent = message;
        storageAvailable = false;
    }

    function isObject(value) {
        return value !== null && typeof value === "object" && !Array.isArray(value);
    }

    function loadGalleryState() {
        let savedState;

        try {
            savedState = window.localStorage.getItem(storageKey);
        } catch (error) {
            if (error instanceof DOMException && error.name === "SecurityError") {
                showStorageMessage("Le navigateur bloque le stockage : vos interactions ne seront pas conservées après fermeture.");
                return {};
            }
            throw error;
        }

        if (!savedState) {
            return {};
        }

        let parsedState;
        try {
            parsedState = JSON.parse(savedState);
        } catch (error) {
            if (error instanceof SyntaxError) {
                showStorageMessage("Les interactions enregistrées sont illisibles. Les nouvelles actions resteront disponibles temporairement.");
                return {};
            }
            throw error;
        }

        if (!isObject(parsedState)) {
            showStorageMessage("Les interactions enregistrées ont un format invalide. Les nouvelles actions resteront disponibles temporairement.");
            return {};
        }

        return parsedState;
    }

    function saveGalleryState() {
        if (!storageAvailable) {
            return;
        }

        try {
            window.localStorage.setItem(storageKey, JSON.stringify(galleryState));
        } catch (error) {
            if (error instanceof DOMException &&
                (error.name === "QuotaExceededError" || error.name === "SecurityError")) {
                showStorageMessage("Le navigateur n’a pas pu enregistrer vos interactions. Elles seront perdues à la fermeture de cette page.");
                return;
            }
            throw error;
        }
    }

    function getPhotoState(photoKey) {
        const savedPhoto = galleryState[photoKey];
        if (!isObject(savedPhoto)) {
            return { liked: false, comments: [] };
        }

        const comments = Array.isArray(savedPhoto.comments)
            ? savedPhoto.comments.filter(comment =>
                isObject(comment) &&
                typeof comment.text === "string" &&
                comment.text.trim().length > 0
            ).slice(-maximumCommentsPerPhoto)
            : [];

        return {
            liked: savedPhoto.liked === true,
            comments
        };
    }

    function createElement(tagName, className, text) {
        const element = document.createElement(tagName);
        if (className) {
            element.className = className;
        }
        if (text !== undefined) {
            element.textContent = text;
        }
        return element;
    }

    function renderComments(list, emptyMessage, comments) {
        list.replaceChildren();

        if (comments.length === 0) {
            list.append(createElement("li", "gallery-comment-empty", emptyMessage));
            return;
        }

        comments.forEach(comment => {
            const item = createElement("li", "gallery-comment");
            const author = createElement("strong", "", "Visiteur");
            const text = createElement("p", "", comment.text);
            item.append(author, text);
            list.append(item);
        });
    }

    galleryState = loadGalleryState();

    galleryItems.forEach((card, index) => {
        const image = card.querySelector("img");
        if (!image) {
            return;
        }

        const photoKey = image.getAttribute("src");
        const photoState = getPhotoState(photoKey);
        galleryState[photoKey] = photoState;

        const actions = createElement("div", "gallery-actions");
        const likeButton = createElement("button", "gallery-action gallery-like-button");
        likeButton.type = "button";
        likeButton.setAttribute("aria-pressed", String(photoState.liked));

        const heart = createElement("span", "gallery-like-icon", photoState.liked ? "♥" : "♡");
        heart.setAttribute("aria-hidden", "true");
        const likeCount = createElement("span", "gallery-like-count", photoState.liked ? "1" : "0");
        likeButton.append(heart, likeCount);

        const commentButton = createElement("button", "gallery-action gallery-comment-toggle");
        commentButton.type = "button";
        commentButton.setAttribute("aria-expanded", "false");
        const commentCount = createElement("span", "gallery-comment-count", `Commentaires (${photoState.comments.length})`);
        commentButton.append(commentCount);

        const commentsPanel = createElement("div", "gallery-comments");
        commentsPanel.hidden = true;
        const heading = createElement("h3", "gallery-comments-title", "Les petits mots");
        heading.id = `gallery-comments-title-${index + 1}`;
        commentButton.setAttribute("aria-controls", heading.id);

        const commentList = createElement("ul", "gallery-comment-list");
        renderComments(commentList, "Soyez le premier à laisser un petit mot.", photoState.comments);

        const form = createElement("form", "gallery-comment-form");
        const label = createElement("label", "", "Votre commentaire");
        const textarea = createElement("textarea", "");
        textarea.name = "comment";
        textarea.rows = 3;
        textarea.maxLength = maximumCommentLength;
        textarea.required = true;
        textarea.placeholder = "Partagez votre avis sur cette photo…";
        textarea.setAttribute("aria-label", `Votre commentaire sur la photo ${index + 1}`);
        const submitButton = createElement("button", "gallery-comment-submit", "Publier le commentaire");
        submitButton.type = "submit";
        const formStatus = createElement("p", "gallery-comment-status");
        formStatus.setAttribute("aria-live", "polite");

        label.htmlFor = `gallery-comment-${index + 1}`;
        textarea.id = label.htmlFor;
        form.append(label, textarea, submitButton, formStatus);
        commentsPanel.append(heading, commentList, form);
        actions.append(likeButton, commentButton);
        card.append(actions, commentsPanel);

        likeButton.setAttribute(
            "aria-label",
            photoState.liked ? `Retirer votre J’aime de la photo ${index + 1}` : `Aimer la photo ${index + 1}`
        );

        likeButton.addEventListener("click", () => {
            photoState.liked = !photoState.liked;
            likeButton.setAttribute("aria-pressed", String(photoState.liked));
            likeButton.setAttribute(
                "aria-label",
                photoState.liked ? `Retirer votre J’aime de la photo ${index + 1}` : `Aimer la photo ${index + 1}`
            );
            heart.textContent = photoState.liked ? "♥" : "♡";
            likeCount.textContent = photoState.liked ? "1" : "0";
            saveGalleryState();
        });

        commentButton.addEventListener("click", () => {
            const isExpanded = commentButton.getAttribute("aria-expanded") === "true";
            commentButton.setAttribute("aria-expanded", String(!isExpanded));
            commentsPanel.hidden = isExpanded;
            if (!isExpanded) {
                textarea.focus();
            }
        });

        form.addEventListener("submit", event => {
            event.preventDefault();
            const text = textarea.value.trim();

            if (!text) {
                formStatus.textContent = "Écrivez un commentaire avant de le publier.";
                textarea.focus();
                return;
            }

            if (text.length > maximumCommentLength) {
                formStatus.textContent = `Votre commentaire ne peut pas dépasser ${maximumCommentLength} caractères.`;
                textarea.focus();
                return;
            }

            if (photoState.comments.length >= maximumCommentsPerPhoto) {
                formStatus.textContent = "Cette photo a atteint la limite de commentaires enregistrés dans ce navigateur.";
                return;
            }

            photoState.comments.push({ text });
            renderComments(commentList, "Soyez le premier à laisser un petit mot.", photoState.comments);
            commentCount.textContent = `Commentaires (${photoState.comments.length})`;
            textarea.value = "";
            formStatus.textContent = "Votre commentaire a été ajouté dans ce navigateur.";
            saveGalleryState();
        });
    });
})();