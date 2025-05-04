const srtFile1 = document.getElementById('srtFile');
        const uploadSection = document.getElementById('upload-section');
        const fileInfo = document.getElementById('file-info');
        const uploadedFileName = document.getElementById('uploaded-file-name');
        const removeFileButton = document.getElementById('remove-file');
        const controlsSection = document.getElementById('controls-section');
        const apiProviderSelect = document.getElementById('apiProvider');
        const apiKeyInputGroup = document.getElementById('api-key-input-group');
        const apiKeyInput = document.getElementById('apiKey');
        const sourceLanguageSelect = document.getElementById('sourceLanguage');
        const targetLanguageInput = document.getElementById('targetLanguage');
        const customPromptTextarea = document.getElementById('customPrompt');
        const translateButton = document.getElementById('translate-button');
        const loadingIndicator = document.getElementById('loading-indicator');
        const loadingText = document.getElementById('loading-text');
        const srtDisplaySection = document.getElementById('srt-display-section');
        const originalSrtContent = document.getElementById('original-srt-content');
        const originalLineCount = document.getElementById('original-line-count');
        const translatedSrtContent = document.getElementById('translated-srt-content');
        const actionsSection = document.getElementById('actions-section');
        const copySrtButton = document.getElementById('copy-srt');
        const downloadSrtButton = document.getElementById('download-srt');
        const copyFeedback = document.getElementById('copy-feedback');
        const messageArea = document.getElementById('message-area');

        let loadedSrtData = []; // To store the parsed SRT objects
        const TRANSLATION_CHUNKS = 5; // Number of parts for progress indicator

        // Function to show messages to the user
        function showMessage(message, type = 'info') {
            messageArea.textContent = message;
            messageArea.className = `mt-6 p-3 rounded ${
                type === 'error' ? 'bg-red-100 border border-red-400 text-red-700' :
                type === 'success' ? 'bg-green-100 border border-green-400 text-green-700' :
                'bg-yellow-100 border border-yellow-400 text-yellow-700'
            }`;
            messageArea.classList.remove('hidden');
        }

        // Function to hide messages
        function hideMessage() {
            messageArea.classList.add('hidden');
        }

        // Function to show loading indicator
        function showLoading(text = 'Loading...') {
            loadingText.textContent = text;
            loadingIndicator.classList.remove('hidden');
            translateButton.disabled = true; // Disable button while loading
        }

        // Function to hide loading indicator
        function hideLoading() {
            loadingIndicator.classList.add('hidden');
             translateButton.disabled = false; // Enable button
        }

        // Function to parse SRT content
        function parseSrt(text) {
            const lines = text.trim().split('\n');
            const srtData = [];
            let currentEntry = null;

            for (const line of lines) {
                const trimmedLine = line.trim();

                if (trimmedLine === '') {
                    // Empty line indicates the end of an entry
                    if (currentEntry) {
                        // Join text lines that might have been split by line breaks within a subtitle
                        currentEntry.text = currentEntry.text.join('\n');
                        srtData.push(currentEntry);
                        currentEntry = null;
                    }
                } else if (/^\d+$/.test(trimmedLine)) {
                    // Line contains only a number, it's a sequence number
                     if (currentEntry) { // Handle case where file might not have blank line at end
                         currentEntry.text = currentEntry.text.join('\n');
                         srtData.push(currentEntry);
                     }
                    currentEntry = { id: parseInt(trimmedLine, 10), time: '', text: [] };
                } else if (trimmedLine.includes('-->')) {
                    // Line contains timecode
                    if (currentEntry) {
                        currentEntry.time = trimmedLine;
                    }
                } else {
                    // Otherwise, it's part of the subtitle text
                    if (currentEntry) {
                        currentEntry.text.push(trimmedLine);
                    }
                }
            }

            // Add the last entry if the file doesn't end with a blank line
            if (currentEntry) {
                 currentEntry.text = currentEntry.text.join('\n');
                srtData.push(currentEntry);
            }

             // Filter out any entries that couldn't be fully parsed (e.g., just numbers without timecodes)
            return srtData.filter(entry => entry.id !== undefined && entry.time !== '' && entry.text.length > 0);
        }

         // Function to format SRT data back into a string
        function formatSrt(srtData) {
            let srtText = '';
            srtData.forEach((entry, index) => {
                srtText += entry.id + '\n';
                srtText += entry.time + '\n';
                srtText += entry.text + '\n'; // Text is already joined in parseSrt
                if (index < srtData.length - 1) {
                    srtText += '\n'; // Add a blank line between entries
                }
            });
            return srtText;
        }


        // Handle file selection
        srtFile1.addEventListener('change', function(event) {
            const file = event.target.files[0];

            if (file) {
                const reader = new FileReader();

                reader.onload = function(e) {
                    try {
                        const srtContent = e.target.result;
                        loadedSrtData = parseSrt(srtContent);

                        if (loadedSrtData.length === 0) {
                            showMessage('Could not parse SRT file or no valid subtitle entries found. Please check the format.', 'error');
                            resetState();
                            return;
                        }

                        // Display original SRT and create editable areas for translation
                        displaySrtContent(loadedSrtData);


                        // Update UI state
                        uploadSection.classList.add('hidden');
                        fileInfo.classList.remove('hidden');
                        uploadedFileName.textContent = `Loaded file: ${file.name}`;
                        controlsSection.classList.remove('hidden');
                        srtDisplaySection.classList.remove('hidden');
                        actionsSection.classList.remove('hidden');
                        hideMessage(); // Hide any previous messages
                         hideLoading(); // Hide loading in case it was showing

                        showMessage(`SRT file "${file.name}" loaded successfully. ${loadedSrtData.length} subtitle entries found.`, 'success');

                    } catch (error) {
                        showMessage('Error reading or parsing the file: ' + error.message, 'error');
                        console.error('Error:', error);
                        resetState();
                    }
                };

                reader.onerror = function(e) {
                    showMessage('Error reading the file.', 'error');
                    console.error('File reading error:', e);
                    resetState();
                };

                reader.readAsText(file);
            }
        });

        // Display parsed SRT content and prepare translation areas
        function displaySrtContent(srtData) {
             originalSrtContent.innerHTML = '';
             translatedSrtContent.innerHTML = ''; // Clear previous content

             srtData.forEach(entry => {
                 const originalDiv = document.createElement('div');
                 originalDiv.className = 'srt-line';
                 originalDiv.innerHTML = `
                     <div class="srt-time">${entry.id}<br>${entry.time}</div>
                     <div class="srt-text">${entry.text.replace(/\n/g, '<br>')}</div> `;
                 originalSrtContent.appendChild(originalDiv);

                 // Create editable area for translation
                  const translatedDiv = document.createElement('div');
                  translatedDiv.className = 'srt-line';
                  translatedDiv.innerHTML = `
                      <div class="srt-time">${entry.id}<br>${entry.time}</div>
                      <div class="srt-text">
                          <textarea class="translated-text-area" data-id="${entry.id}" placeholder="Enter translation..."></textarea>
                      </div>
                  `;
                  translatedSrtContent.appendChild(translatedDiv);
             });

             originalLineCount.textContent = srtData.length;
        }


        // Handle file removal
        removeFileButton.addEventListener('click', function() {
            resetState();
            showMessage('File removed.');
        });

        // Reset UI and state
        function resetState() {
            srtFile1.value = ''; // Clear the file input
            loadedSrtData = [];
            originalSrtContent.innerHTML = '';
            translatedSrtContent.innerHTML = '';
            originalLineCount.textContent = '0';
             apiKeyInput.value = ''; // Clear API key input

            uploadSection.classList.remove('hidden');
            fileInfo.classList.add('hidden');
            uploadedFileName.textContent = '';
            controlsSection.classList.add('hidden');
            srtDisplaySection.classList.add('hidden');
            actionsSection.classList.add('hidden');
             copyFeedback.classList.add('hidden'); // Hide copy feedback
             hideMessage(); // Hide message area
             hideLoading(); // Ensure loading is hidden
        }

        // Toggle API key input visibility based on API provider selection
        apiProviderSelect.addEventListener('change', function() {
             if (apiProviderSelect.value === 'manual') {
                 apiKeyInputGroup.classList.add('hidden'); // Hide the input group
             } else {
                 apiKeyInputGroup.classList.remove('hidden'); // Show the input group
             }
        });

        // --- Translation Logic (API Integration Placeholder) ---

        // Function to translate a chunk of SRT entries using the selected API
        async function translateChunk(chunk, api, apiKey, sourceLang, targetLang, prompt) {
            // Prepare the text to send to the API
            // Joining with a unique delimiter helps maintain correspondence after translation
            const textsToTranslate = chunk.map(entry => entry.text);
            const combinedText = textsToTranslate.join('\n---\n'); // Use a delimiter

            let translatedTexts = [];
            let apiUrl = '';
            let requestBody = {};
            let headers = {
                 'Content-Type': 'application/json',
            };

            try {
                // --- Configure API Request based on Provider ---
                if (api === 'gemini') {
                    // *** IMPORTANT: Replace with the actual Gemini API endpoint for translation ***
                    // This is a placeholder structure. Refer to Google Gemini API documentation.
                    // Example: https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent
                    apiUrl = `YOUR_GEMINI_API_ENDPOINT?key=${apiKey}`;
                    requestBody = {
                         contents: [{
                            parts: [{
                                text: `${prompt ? prompt + '\n\n' : ''}Translate the following text from ${sourceLang} to ${targetLang}. Preserve the line breaks and indicate translated sections using the delimiter '---':\n\n${combinedText}`
                            }]
                         }],
                         // Add generation config or safety settings if needed
                    };
                    // Depending on the Gemini API endpoint/config, you might use an Authorization header instead of a URL param for the key

                } else if (api === 'openai') {
                    // Example for OpenAI Chat Completions API (adjust model and structure)
                    apiUrl = 'https://api.openai.com/v1/chat/completions'; // Standard endpoint
                    headers['Authorization'] = `Bearer ${apiKey}`;
                    requestBody = {
                         model: 'gpt-3.5-turbo', // Or 'gpt-4', 'gpt-4o', etc.
                         messages: [
                             { role: 'system', content: `${prompt ? prompt + '\n\n' : ''}You are a helpful translator. Translate the following text from ${sourceLang} to ${targetLang}. The text contains subtitle entries separated by '---'. Provide the translation for each entry, separated by '---'. Preserve original line breaks within entries.` },
                             { role: 'user', content: combinedText }
                         ],
                         // Add response_format: { type: "text" } if available and preferred
                    };

                } else if (api === 'deepseek') {
                     // Example for DeepSeek Chat API (adjust model and structure)
                     apiUrl = 'https://api.deepseek.com/chat/completions'; // Standard endpoint
                     headers['Authorization'] = `Bearer ${apiKey}`;
                     requestBody = {
                          model: 'deepseek-chat', // Or other supported model
                          messages: [
                             { role: 'system', content: `${prompt ? prompt + '\n\n' : ''}You are a helpful translator. Translate the following text from ${sourceLang} to ${targetLang}. The text contains subtitle entries separated by '---'. Provide the translation for each entry, separated by '---'. Preserve original line breaks within entries.` },
                             { role: 'user', content: combinedText }
                          ],
                     };

                } else {
                    // This case should be caught before calling translateChunk, but included for robustness
                    throw new Error("Invalid API provider selected.");
                }

                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(requestBody)
                });

                if (!response.ok) {
                    const errorBody = await response.text(); // Attempt to get error details
                    let errorMsg = `API request failed with status ${response.status}.`;
                    try {
                        const errorJson = JSON.parse(errorBody);
                        errorMsg += ` Error: ${errorJson.error.message || errorBody}`;
                    } catch {
                        errorMsg += ` Response: ${errorBody}`;
                    }
                    throw new Error(errorMsg);
                }

                const data = await response.json();

                // --- Extract Translated Text from API Response ---
                let translatedCombinedText = '';
                 // Adjust this based on the actual API response structure for each provider
                if (api === 'gemini') {
                     // Example: assuming text is in candidates -> content -> parts
                     translatedCombinedText = data.candidates?.[0]?.content?.parts?.map(part => part.text).join('') || '';
                } else if (api === 'openai' || api === 'deepseek') {
                     // Example: assuming text is in choices -> message -> content
                     translatedCombinedText = data.choices?.[0]?.message?.content || '';
                }

                // Split the translated combined text back into individual entries using the delimiter
                translatedTexts = translatedCombinedText.split('\n---\n').map(text => text.trim());

                // --- Post-processing and Validation ---
                // Ensure the number of translated segments matches the original chunk size
                if (translatedTexts.length !== chunk.length) {
                     console.warn(`Translation mismatch for API ${api}. Expected ${chunk.length} segments, got ${translatedTexts.length}. Attempting to align.`);

                     // Basic attempt to align if mismatch occurs (can be improved)
                     const alignedTexts = [];
                     for(let k = 0; k < chunk.length; k++) {
                          if (k < translatedTexts.length) {
                               alignedTexts.push(translatedTexts[k]);
                          } else {
                               // If translation has fewer segments, use original or empty
                               alignedTexts.push(chunk[k].text); // Use original text as fallback
                          }
                     }
                     translatedTexts = alignedTexts;

                }


            } catch (error) {
                console.error(`Error translating chunk (API: ${api}):`, error);
                showMessage(`Translation failed for a part using ${api.toUpperCase()}. Check console for details. You may need to translate this part manually. Error: ${error.message}`, 'error');
                // Return original texts on error so the user can edit them
                translatedTexts = chunk.map(entry => entry.text);
            }

            return translatedTexts;
        }


        // Handle Translate Button
        translateButton.addEventListener('click', async function() {
            const api = apiProviderSelect.value;
            const apiKey = apiKeyInput.value.trim();
            const sourceLang = sourceLanguageSelect.value;
            const targetLang = targetLanguageInput.value.trim();
            const prompt = customPromptTextarea.value.trim();

            if (api !== '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' && !apiKey) {
                showMessage('Please enter your API key or select Manual Editing.', 'warning');
                return;
            }

             if (api !== 'manual' && !targetLang) {
                  showMessage('Please enter the target language code for the API.', 'warning');
                  return;
             }

            if (loadedSrtData.length === 0) {
                 showMessage('Please upload an SRT file first.', 'warning');
                 return;
            }


            showLoading('Starting translation...');
            hideMessage(); // Hide previous messages
            copyFeedback.classList.add('hidden'); // Hide copy feedback

            if (api === 'manual') {
                 showMessage("Manual editing mode activated. Please type your translations in the right-hand side text boxes.", 'info');
                 hideLoading(); // No loading needed for manual
                 return; // Exit the function, as no API call is needed
            }

            // --- API Translation Process ---
            const totalEntries = loadedSrtData.length;
            // Calculate chunk size, ensuring at least one entry per chunk if possible
            const chunkSize = Math.max(1, Math.ceil(totalEntries / TRANSLATION_CHUNKS));
            let translatedEntriesCount = 0;

            // Clear previous translations in textareas before starting 