async function getRatedComments(comments) {
    try {
        console.log("Fetching ratings from backend...");
        const response = await fetch(
            "http://127.0.0.1:5000/predict_extension",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ comments: comments.slice(0, 10) }),
            }
        );
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching ratings", error);
        return null;
    }
}

function getTopComments() {
    return Array.from(
        document.querySelectorAll(
            "#comments #sections #contents ytd-comment-thread-renderer #comment #body #main #expander #content #content-text span"
        )
    )
        .slice(0, 10)
        .map((comment) => comment.innerText.trim()) // Extract text properly
}

async function injectSentimentScores() {
    const commentElements = Array.from(
        document.querySelectorAll(
            "#comments #sections #contents ytd-comment-thread-renderer #comment #body #main #expander #content #content-text"
        )
    );

    if (!commentElements.length) {
        console.log("No comments found yet. Retrying...");
        return;
    }

    const comments = commentElements.map((el) => el.innerText.trim()).filter((text) => text.length > 0);
    console.log("Extracted comments:", comments);

    if (!comments.length) return;

    // Send to backend for analysis (replace placeholder)
    // const ratedComments = await getRatedComments(comments);
    const ratedComments = comments.map(() => ({ quality: 3, difficulty: 3 })); // Placeholder for testing

    commentElements.forEach((commentElement, index) => {
        if (!commentElement.dataset.sentimentAdded && ratedComments[index]) {
            const { quality, difficulty } = ratedComments[index];

            // Create sentiment span
            const sentiment = document.createElement("span");
            sentiment.textContent = ` [Quality: ${quality}, Difficulty: ${difficulty}]`;
            sentiment.style.color = "gold";
            sentiment.style.marginLeft = "8px";

            // Append sentiment after the comment text
            commentElement.appendChild(sentiment);

            // Mark this comment to avoid duplicate insertions
            commentElement.dataset.sentimentAdded = "true";
        }
    });
}


// Wait for comments to be available
function waitForCommentsToLoad() {
    const checkInterval = setInterval(() => {
        const commentsSection = document.querySelector(
            "#comments #sections #contents"
        );
        if (commentsSection) {
            console.log(
                "Comments section found. Injecting sentiment scores..."
            );
            clearInterval(checkInterval); // Stop checking once found
            injectSentimentScores();
            observeComments();
        }
    }, 5000);
}

// Watch for new comments
function observeComments() {
    const commentsContainer = document.querySelector(
        "#comments #sections #contents"
    );
    if (!commentsContainer) return;

    const observer = new MutationObserver(() => {
        console.log("New comments detected. Injecting sentiment scores...");
        injectSentimentScores();
    });

    observer.observe(commentsContainer, { childList: true, subtree: true });
}

// Ensure everything runs at the right time
window.onload = waitForCommentsToLoad;
