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

// **Create and Insert the Overlay & Modal**
function createOverlayModal() {
    if (document.getElementById("analyze-overlay")) return; // Prevent duplicates

    // **Overlay**
    const overlay = document.createElement("div");
    overlay.id = "analyze-overlay";
    overlay.style = `
        position: fixed;
        top: 0; left: 0;
        width: 100vw; height: 100vh;
        background: rgba(0, 0, 0, 0.7);
        display: flex; align-items: center; justify-content: center;
        z-index: 9999;
    `;

    // **Modal**
    const modal = document.createElement("div");
    modal.id = "analyze-modal";
    modal.style = `
        background: white;
        padding: 20px;
        border-radius: 8px;
        text-align: center;
        min-width: 300px;
    `;
    modal.innerHTML = `
        <h3>Analyzing Comments...</h3>
        <div id="analyze-progress-bar" style="
            width: 100%; 
            height: 10px; 
            background: #ddd; 
            border-radius: 5px; 
            overflow: hidden; 
            margin-top: 10px;">
            <div id="progress-bar-fill" style="
                width: 0%; 
                height: 100%; 
                background: gold; 
                transition: width 0.2s;">
            </div>
        </div>
        <p id="progress-text">0/100 comments analyzed</p>
        <button id="cancel-analysis" style="
            background: #FFD700; 
            color: black; 
            padding: 8px 12px; 
            margin-top: 15px; 
            border: none; 
            border-radius: 5px; 
            cursor: pointer;
        ">Cancel</button>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // **Cancel Button Event**
    document.getElementById("cancel-analysis").addEventListener("click", () => {
        cancelAnalysis();
    });
}

// **Remove Overlay & Modal**
function removeOverlayModal() {
    console.log("🔼 Scrolling back to top...");

    // Scroll to the top smoothly
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Wait a short delay before removing the modal (to allow scrolling to finish)
    setTimeout(() => {
        const overlay = document.getElementById("analyze-overlay");
        if (overlay) overlay.remove();
        console.log("✅ Modal removed.");
    }, 1000); // Adjust delay as needed
}

// **Cancel Analysis**
let isAnalysisCanceled = false;
function cancelAnalysis() {
    isAnalysisCanceled = true;
    removeOverlayModal();
    console.log("❌ Analysis canceled by user.");
}

// **Scroll to Load More Comments (with Cancel Support)**
async function loadMoreComments(targetCount = 100, scrollInterval = 2000) {
    let previousCount = 0;
    let retries = 0;
    const maxRetries = 10;

    return new Promise((resolve) => {
        const interval = setInterval(() => {
            if (isAnalysisCanceled) {
                clearInterval(interval);
                resolve();
                return;
            }

            const comments = document.querySelectorAll("#content-text");
            console.log(`🔄 Loaded comments: ${comments.length}`);

            // **Update Progress (90%)**
            let progress = Math.min((comments.length / targetCount) * 90, 90);
            document.getElementById(
                "progress-bar-fill"
            ).style.width = `${progress}%`;
            document.getElementById(
                "progress-text"
            ).innerText = `Loading comments... (${progress.toFixed(1)}%)`;

            if (comments.length >= targetCount) {
                clearInterval(interval);
                console.log("✅ Finished loading comments.");
                resolve();
                return;
            }

            if (comments.length === previousCount) {
                retries++;
                if (retries >= maxRetries) {
                    clearInterval(interval);
                    console.log("❌ No more comments to load.");
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

// Function to Create & Download CSV
function downloadCSV(commentsData) {
    if (!commentsData || commentsData.length === 0) {
        console.error("❌ No comments data to export.");
        return;
    }

    // Prepare CSV content
    let csvContent = "data:text/csv;charset=utf-8,Comment,Quality,Difficulty\n";
    commentsData.forEach(({ comment, quality, difficulty }) => {
        const escapedComment = comment.replace(/"/g, '""'); // Escape quotes
        csvContent += `"${escapedComment}",${quality},${difficulty}\n`;
    });

    // Create a download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "comments_ratings.csv");
    document.body.appendChild(link);

    // Auto-trigger download
    link.click();
    document.body.removeChild(link);
}

// **Inject Summary Above Comments**
function injectSummaryBox(averageQuality, averageDifficulty) {
    let existingBox = document.getElementById("sentiment-summary-box");

    if (!existingBox) {
        existingBox = document.createElement("div");
        existingBox.id = "sentiment-summary-box";
        existingBox.style = `
            background-color: rgba(255, 215, 0, 0.2); 
            color: gold; 
            padding: 10px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 10px;
            text-align: center;
            width: fit-content;
        `;

        const commentsContainer = document.querySelector("#comments");
        if (commentsContainer) {
            commentsContainer.prepend(existingBox);
        }
    }

    existingBox.innerHTML = `📊 <strong>Average Quality:</strong> ${averageQuality.toFixed(
        2
    )}/5 | 🎯 <strong>Average Difficulty:</strong> ${averageDifficulty.toFixed(
        2
    )}/5`;
}

// Function to Create & Insert CSV Download Button
function createDownloadButton(commentsData) {
    let existingButton = document.getElementById("download-csv-btn");

    if (!existingButton) {
        const button = document.createElement("button");
        button.id = "download-csv-btn";
        button.innerText = "Download CSV";
        button.style = `
            background-color: green;
            color: white;
            font-size: 14px;
            font-weight: bold;
            padding: 10px 15px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            display: block;
            margin: 10px auto;
        `;

        button.onclick = () => downloadCSV(commentsData);

        const container = document.getElementById("analyze-container");
        if (container) {
            container.appendChild(button);
        }
    }
}

// **Modified Inject Sentiment Scores (with Progress Bar)**
async function injectSentimentScores(targetCount = 100) {
    createOverlayModal();
    isAnalysisCanceled = false;

    console.log(`⏳ Loading ${targetCount} comments...`);
    await loadMoreComments(targetCount);

    if (isAnalysisCanceled) return removeOverlayModal();

    let commentElements = Array.from(
        document.querySelectorAll("#content-text")
    );
    let comments = commentElements
        .map((el) => el.innerText.trim())
        .filter((text) => text.length > 0);

    if (!comments.length) {
        removeOverlayModal();
        console.log("❌ No comments found.");
        return;
    }

    console.log(`📝 Processing ${comments.length} comments...`);
    const ratedComments = await getRatedComments(comments);

    if (isAnalysisCanceled) return removeOverlayModal();

    if (!ratedComments || ratedComments.length !== comments.length) {
        console.error("❌ Backend response size mismatch.");
        removeOverlayModal();
        return;
    }

    // **Update Progress Bar**
    function updateProgress(index, total) {
        const progress = 90 + ((index + 1) / total) * 10; // Increase from 90% to 100%
        document.getElementById(
            "progress-bar-fill"
        ).style.width = `${progress}%`;
        document.getElementById(
            "progress-text"
        ).innerText = `Analyzing comments... (${progress.toFixed(1)}%)`;
    }

    let totalQuality = 0;
    let totalDifficulty = 0;
    let commentsData = [];

    ratedComments.forEach(({ quality, difficulty }, index) => {
        if (isAnalysisCanceled) return removeOverlayModal();

        totalQuality += quality;
        totalDifficulty += difficulty;

        commentsData.push({
            comment: comments[index],
            quality,
            difficulty,
        });

        updateProgress(index, ratedComments.length);
    });

    let averageQuality = totalQuality / ratedComments.length;
    let averageDifficulty = totalDifficulty / ratedComments.length;

    // **Inject Summary**
    injectSummaryBox(averageQuality, averageDifficulty);

    // **Inject Ratings into Comments**
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
                    display: inline-block;">
                    ⭐ Quality: ${quality} | 🎯 Difficulty: ${difficulty}
                </span>
            `;

            commentElement.appendChild(sentiment);
            commentElement.dataset.sentimentAdded = "true";
        }
    });

    console.log("✅ Sentiment scores injected successfully.");
    removeOverlayModal();

    // **Create CSV Download Button**
    createDownloadButton(commentsData);
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

// **Modify Start Button to Show Modal**
function createStartButton() {
    let existingContainer = document.getElementById("analyze-container");

    if (!existingContainer) {
        // Create a container for button and dropdown
        const container = document.createElement("div");
        container.id = "analyze-container";
        container.style = `
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 10px;
            margin-bottom: 10px;
        `;

        // Create dropdown for selecting comment count
        const dropdown = document.createElement("select");
        dropdown.id = "comment-count-dropdown";
        dropdown.style = `
            padding: 10px;
            font-size: 14px;
            border-radius: 8px;
            cursor: pointer;
        `;

        // Add options
        [100, 500, 1000].forEach((value) => {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = `Analyze ${value} Comments`;
            dropdown.appendChild(option);
        });

        // Create the analyze button
        const button = document.createElement("button");
        button.id = "analyze-comments-btn";
        button.innerText = "Analyze Comments";
        button.style = `
            background-color: gold;
            color: black;
            font-size: 14px;
            font-weight: bold;
            padding: 10px 15px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
        `;

        button.onclick = async () => {
            button.disabled = true;
            button.style.opacity = "0.5";
            button.innerText = "Analyzing...";

            const targetCount = parseInt(dropdown.value, 10); // Get selected value

            await injectSentimentScores(targetCount); // Pass selected value

            button.innerText = "Analysis Complete";
            button.disabled = false;
            button.style.opacity = "1";
        };

        // Append elements
        container.appendChild(dropdown);
        container.appendChild(button);

        // Insert container before comments section
        const commentsContainer = document.querySelector("#comments");
        if (commentsContainer) {
            commentsContainer.prepend(container);
        }
    }
}

// **Wait for Comments Section to Load & Then Insert Button**
function waitForCommentsSection() {
    const observer = new MutationObserver((mutations, obs) => {
        const commentsContainer = document.querySelector(
            "#comments #sections #contents"
        );
        if (commentsContainer) {
            console.log("✅ Comments section detected. Injecting button...");
            createStartButton();
            obs.disconnect(); // Stop observing once found
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

// **Run Only After Page Load & Wait for Comments Section**
window.onload = () => {
    waitForCommentsSection(); // Wait for comments to load before adding the button
};
