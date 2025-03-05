// content.js (Fetch comments and inject dummy sentiment ratings)
function injectSentimentScores() {
    const commentElements = document.querySelectorAll("#content-text");
    commentElements.forEach((comment) => {
        if (!comment.nextElementSibling) {
            const stars = "⭐".repeat(Math.floor(Math.random() * 5) + 1);
            const sentiment = document.createElement("span");
            sentiment.textContent = ` ${stars}`;
            sentiment.style.color = "gold";
            sentiment.style.marginLeft = "8px";
            comment.parentNode.appendChild(sentiment);
        }
    });
}

const observer = new MutationObserver(() => {
    injectSentimentScores();
});
observer.observe(document, { childList: true, subtree: true });
