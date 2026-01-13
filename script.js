document.addEventListener('DOMContentLoaded', () => {
    // --- Hero Typing Animation ---
    const typingTextElement = document.getElementById('typing-text');
    const words = ["Creativity", "Productivity", "Learning", "Coding", "Writing"];
    let wordIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let typeSpeed = 100;

    function typeEffect() {
        const currentWord = words[wordIndex];
        
        if (isDeleting) {
            typingTextElement.textContent = currentWord.substring(0, charIndex - 1);
            charIndex--;
            typeSpeed = 50;
        } else {
            typingTextElement.textContent = currentWord.substring(0, charIndex + 1);
            charIndex++;
            typeSpeed = 150;
        }

        if (!isDeleting && charIndex === currentWord.length) {
            isDeleting = true;
            typeSpeed = 2000; // Pause at end of word
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            wordIndex = (wordIndex + 1) % words.length;
            typeSpeed = 500; // Pause before new word
        }

        setTimeout(typeEffect, typeSpeed);
    }
    
    // Start typing animation
    if(typingTextElement) typeEffect();


    // --- Interactive Capabilities Demo ---
    const chatInput = document.getElementById('chat-input');
    const chatWindow = document.getElementById('chat-window');
    const featureItems = document.querySelectorAll('.feature-item');
    const chatSendBtn = document.getElementById('chat-send');
    const emptyState = document.querySelector('.empty-state');

    // Demo Data Scenarios
    const demos = {
        writing: {
            prompt: "Write a haiku about artificial intelligence.",
            response: "Silicon mind wakes,\nLearning from the world of men,\nFuture now begins."
        },
        coding: {
            prompt: "How do I center a div in CSS?",
            response: "To center a div horizontally and vertically, you can use Flexbox:\n\n.parent {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n}"
        },
        analysis: {
            prompt: "Summarize the benefits of renewable energy.",
            response: "Renewable energy reduces greenhouse gas emissions, lowers energy costs in the long run, improves public health by reducing pollution, and creates jobs in new green technology sectors."
        }
    };

    let currentFeature = 'writing';
    let isDemoRunning = false;

    // Feature Selection Logic
    featureItems.forEach(item => {
        item.addEventListener('click', () => {
            if (isDemoRunning) return; // Prevent switching while typing
            
            // Update Active State
            featureItems.forEach(f => f.classList.remove('active'));
            item.classList.add('active');

            // Set Current Feature
            currentFeature = item.dataset.feature;
            
            // Reset Chat Interface to Empty State
            chatWindow.innerHTML = '';
            if (emptyState) {
                chatWindow.appendChild(emptyState);
                emptyState.style.display = 'flex';
            }
            
            chatInput.value = demos[currentFeature].prompt;
        });
    });

    // Run Demo on Click
    chatSendBtn.addEventListener('click', async () => {
        if (isDemoRunning) return;
        isDemoRunning = true;

        // 1. Hide Empty State
        if(emptyState) emptyState.style.display = 'none';

        const prompt = demos[currentFeature].prompt;
        
        // 2. Add User Message
        addMessage(prompt, 'user-message');
        chatInput.value = ''; // Clear input immediately like real chat

        // 3. Simulate Thinking
        await new Promise(r => setTimeout(r, 600));

        // 4. Stream Response
        await streamResponse(demos[currentFeature].response);

        // 5. Reset Input for replay
        chatInput.value = demos[currentFeature].prompt;
        isDemoRunning = false;
    });

    // Helper: Add Message Bubble
    function addMessage(text, className) {
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('message', className);
        
        if (className === 'user-message') {
            msgDiv.innerHTML = `<div class="user-message-bubble">${text}</div>`;
        }
        
        chatWindow.appendChild(msgDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    // Helper: Stream Text Response
    function streamResponse(text) {
        return new Promise(resolve => {
            const msgDiv = document.createElement('div');
            msgDiv.classList.add('message', 'system-message');
            
            // Structure for AI response
            const contentDiv = document.createElement('div');
            contentDiv.classList.add('system-message-content');
            
            const iconDiv = document.createElement('div');
            iconDiv.classList.add('gpt-icon');
            iconDiv.innerHTML = '<img src="https://unpkg.com/@lobehub/icons-static-svg@latest/icons/openai.svg" width="16" height="16" style="filter: brightness(0) invert(1);">';
            
            const textDiv = document.createElement('div');
            textDiv.classList.add('text-content');
            
            contentDiv.appendChild(iconDiv);
            contentDiv.appendChild(textDiv);
            msgDiv.appendChild(contentDiv);
            
            chatWindow.appendChild(msgDiv);
            
            let i = 0;
            const interval = setInterval(() => {
                const char = text.charAt(i);
                if (char === '\n') {
                    textDiv.innerHTML += '<br>';
                } else {
                    textDiv.innerHTML += char;
                }
                chatWindow.scrollTop = chatWindow.scrollHeight;
                i++;
                if (i >= text.length) {
                    clearInterval(interval);
                    resolve();
                }
            }, 30);
        });
    }

    // Initialize First Tab
    if (featureItems.length > 0) {
        // Just set the active state and input, don't trigger full click logic to keep empty state
        featureItems.forEach(f => f.classList.remove('active'));
        featureItems[0].classList.add('active');
        if (chatInput) chatInput.value = demos['writing'].prompt;
    }

    // --- Intersection Observer for Animations & Demo Start ---
    const observerOptions = {
        threshold: 0.2
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('show-fade');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const hiddenElements = document.querySelectorAll('.hidden-fade');
    hiddenElements.forEach((el) => observer.observe(el));
});