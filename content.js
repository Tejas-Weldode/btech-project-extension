async function getRatedComments(comments) {
    try {
        console.log(`📡 Sending ${comments.length} comments for analysis...`);
        const response = await fetch(
            "http://127.0.0.1:5000/predict_extension",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ comments: comments }), // Send all comments
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("❌ Error fetching ratings:", error);
        return null;
    }
}

// **Scroll to Load More Comments**
async function loadMoreComments(targetCount = 100, scrollInterval = 2000) {
    let previousCount = 0;
    let retries = 0;
    const maxRetries = 10;

    return new Promise((resolve) => {
        const interval = setInterval(() => {
            const comments = document.querySelectorAll(
                "#comments #sections #contents ytd-comment-thread-renderer #comment #body #main #expander #content #content-text"
            );

            console.log(`🔄 Loaded comments: ${comments.length}`);

            if (comments.length >= targetCount) {
                clearInterval(interval);
                console.log(
                    "✅ Finished loading comments. Scrolling back to top..."
                );
                window.scrollTo({ top: 0, behavior: "smooth" });
                resolve();
                return;
            }

            if (comments.length === previousCount) {
                retries++;
                console.log(
                    `⚠️ No new comments loaded. Retry ${retries}/${maxRetries}`
                );

                if (retries >= maxRetries) {
                    clearInterval(interval);
                    console.log("❌ No more comments to load.");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                    resolve();
                    return;
                }
            } else {
                retries = 0;
            }

            previousCount = comments.length;
            window.scrollBy(0, 1000);
        }, scrollInterval);
    });
}

// **Extract All Comments**
function getAllComments() {
    return Array.from(
        document.querySelectorAll(
            "#comments #sections #contents ytd-comment-thread-renderer #comment #body #main #expander #content #content-text"
        )
    )
        .map((comment) => comment.innerText.trim())
        .filter((text) => text.length > 0);
}

// **Inject Sentiment Scores**
async function injectSentimentScores() {
    console.log("⏳ Loading comments...");
    await loadMoreComments(100);

    let commentElements = Array.from(
        document.querySelectorAll(
            "#comments #sections #contents ytd-comment-thread-renderer #comment #body #main #expander #content #content-text"
        )
    );

    if (!commentElements.length) {
        console.log("❌ No comments found. Exiting...");
        return;
    }

    let comments = getAllComments();
    console.log(`📝 Processing ${comments.length} comments...`);

    if (!comments.length) return;

    // ✅ Fix: Send all 100 comments to backend
    const ratedComments = await getRatedComments(comments);
    console.log("ratedComments", ratedComments);
    if (!ratedComments || ratedComments.length !== comments.length) {
        console.error("❌ Backend response size mismatch.");
        return;
    }

    // ✅ Fix: Ensure ratings are correctly matched to comments
    commentElements.forEach((commentElement, index) => {
        if (!commentElement.dataset.sentimentAdded && ratedComments[index]) {
            const { quality, difficulty } = ratedComments[index];

            const sentiment = document.createElement("span");
            sentiment.innerHTML = ` 
    <span style="
        background-color: rgba(255, 215, 0, 0.2); 
        color: gold; 
        padding: 3px 8px; 
        margin-left: 10px; 
        border-radius: 12px; 
        font-size: 12px; 
        font-weight: bold; 
        display: inline-block;
    ">
        ⭐ Quality: ${quality} | 🎯 Difficulty: ${difficulty}
    </span>
`;

            commentElement.appendChild(sentiment);
            commentElement.dataset.sentimentAdded = "true";
        }
    });

    console.log("✅ Sentiment scores injected successfully.");
}

// **Observe for New Comments (Handles Lazy Loading)**
function observeNewComments() {
    const commentsContainer = document.querySelector(
        "#comments #sections #contents"
    );
    if (!commentsContainer) return;

    const observer = new MutationObserver(() => {
        console.log("🔄 New comments detected. Injecting sentiment scores...");
        injectSentimentScores();
    });

    observer.observe(commentsContainer, { childList: true, subtree: true });
}

// **Run Everything After Page Load**
window.onload = () => {
    injectSentimentScores();
    observeNewComments();
};
