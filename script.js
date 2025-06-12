// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const dropArea = document.getElementById('dropArea');
    const fileInput = document.getElementById('fileInput');
    const selectFilesBtn = document.getElementById('selectFiles');
    const previewArea = document.getElementById('previewArea');
    const imagePreview = document.getElementById('imagePreview');
    const clearAllBtn = document.getElementById('clearAll');
    const convertBtn = document.getElementById('convertBtn');
    const progressBar = document.getElementById('progressBar');
    const progressBarFill = document.getElementById('progressBarFill');
    const progressText = document.getElementById('progressText');
    
    // Settings elements
    const pageSize = document.getElementById('pageSize');
    const customSizeGroup = document.getElementById('customSizeGroup');
    const pageLayout = document.getElementById('pageLayout');
    const contactSheetOptions = document.getElementById('contactSheetOptions');
    const border = document.getElementById('border');
    const borderOptions = document.getElementById('borderOptions');
    
    // Array to store selected files
    let files = [];
    
    // Initialize JS PDF
    const { jsPDF } = window.jspdf;
    
    // Event listeners for settings that show/hide options
    pageSize.addEventListener('change', function() {
        if (this.value === 'custom') {
            customSizeGroup.classList.remove('hidden');
        } else {
            customSizeGroup.classList.add('hidden');
        }
    });
    
    pageLayout.addEventListener('change', function() {
        if (this.value === 'contact') {
            contactSheetOptions.classList.remove('hidden');
        } else {
            contactSheetOptions.classList.add('hidden');
        }
    });
    
    border.addEventListener('change', function() {
        if (this.value === 'none') {
            borderOptions.classList.add('hidden');
        } else {
            borderOptions.classList.remove('hidden');
        }
    });
    
    // File selection
    selectFilesBtn.addEventListener('click', function() {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', function(e) {
        handleFiles(e.target.files);
    });
    
    // Drag and drop functionality
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight() {
        dropArea.classList.add('highlight');
    }
    
    function unhighlight() {
        dropArea.classList.remove('highlight');
    }
    
    dropArea.addEventListener('drop', function(e) {
        const dt = e.dataTransfer;
        const droppedFiles = dt.files;
        handleFiles(droppedFiles);
    });
    
    // Handle selected files
    function handleFiles(selectedFiles) {
        if (selectedFiles.length > 0) {
            // Convert FileList to array and filter only images
            const imageFiles = Array.from(selectedFiles).filter(file => file.type.startsWith('image/'));
            
            if (imageFiles.length > 0) {
                files = [...files, ...imageFiles];
                updatePreview();
                previewArea.style.display = 'block';
            } else {
                alert('Please select only image files.');
            }
        }
    }
    
    // Update image preview
    function updatePreview() {
        imagePreview.innerHTML = '';
        
        files.forEach((file, index) => {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                const previewItem = document.createElement('div');
                previewItem.className = 'preview-item';
                
                const img = document.createElement('img');
                img.src = e.target.result;
                img.alt = file.name;
                
                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove-btn';
                removeBtn.innerHTML = '×';
                removeBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    removeFile(index);
                });
                
                previewItem.appendChild(img);
                previewItem.appendChild(removeBtn);
                imagePreview.appendChild(previewItem);
            };
            
            reader.readAsDataURL(file);
        });
    }
    
    // Remove a file from the list
    function removeFile(index) {
        files.splice(index, 1);
        updatePreview();
        
        if (files.length === 0) {
            previewArea.style.display = 'none';
        }
    }
    
    // Clear all files
    clearAllBtn.addEventListener('click', function() {
        files = [];
        updatePreview();
        previewArea.style.display = 'none';
    });
    
    // Convert to PDF
    convertBtn.addEventListener('click', function() {
        if (files.length === 0) {
            alert('Please select at least one image to convert.');
            return;
        }
        
        // Show progress bar
        progressBar.classList.remove('hidden');
        progressBarFill.style.width = '0%';
        progressText.textContent = '0%';
        
        // Get settings
        const settings = {
            pageSize: pageSize.value,
            customWidth: parseFloat(document.getElementById('customWidth').value),
            customHeight: parseFloat(document.getElementById('customHeight').value),
            orientation: document.getElementById('pageOrientation').value,
            pageLayout: pageLayout.value,
            columns: parseInt(document.getElementById('columns').value),
            rows: parseInt(document.getElementById('rows').value),
            spacing: parseFloat(document.getElementById('spacing').value),
            margin: parseFloat(document.getElementById('margin').value),
            border: border.value,
            borderWidth: parseFloat(document.getElementById('borderWidth').value),
            borderColor: document.getElementById('borderColor').value,
            compression: document.getElementById('compression').value,
            outputName: document.getElementById('outputName').value || 'output.pdf'
        };
        
        // Convert based on layout
        if (settings.pageLayout === 'contact') {
            convertToContactSheet(files, settings);
        } else if (settings.pageLayout === 'double') {
            convertToDoubleSpread(files, settings);
        } else {
            convertSinglePage(files, settings);
        }
    });
    
    // Convert images to single page PDF
    async function convertSinglePage(images, settings) {
        const pdf = new jsPDF();
        const totalImages = images.length;
        let processed = 0;
        
        for (let i = 0; i < images.length; i++) {
            const image = images[i];
            const imageUrl = await readFileAsDataURL(image);
            const img = await loadImage(imageUrl);
            
            // Calculate dimensions based on settings
            const pageDimensions = getPageDimensions(settings);
            let imgWidth = img.width;
            let imgHeight = img.height;
            
            // Calculate aspect ratio
            const aspectRatio = imgWidth / imgHeight;
            
            // Determine orientation
            let isLandscape = false;
            if (settings.orientation === 'auto') {
                isLandscape = imgWidth > imgHeight;
            } else {
                isLandscape = settings.orientation === 'landscape';
            }
            
            // Calculate dimensions to fit page with margin
            const pageWidth = isLandscape ? pageDimensions.height : pageDimensions.width;
            const pageHeight = isLandscape ? pageDimensions.width : pageDimensions.height;
            
            const availableWidth = pageWidth - (settings.margin * 2);
            const availableHeight = pageHeight - (settings.margin * 2);
            
            let displayWidth, displayHeight;
            
            if (imgWidth > imgHeight) {
                displayWidth = availableWidth;
                displayHeight = availableWidth / aspectRatio;
                
                if (displayHeight > availableHeight) {
                    displayHeight = availableHeight;
                    displayWidth = availableHeight * aspectRatio;
                }
            } else {
                displayHeight = availableHeight;
                displayWidth = availableHeight * aspectRatio;
                
                if (displayWidth > availableWidth) {
                    displayWidth = availableWidth;
                    displayHeight = availableWidth / aspectRatio;
                }
            }
            
            // Calculate position to center image
            const x = (pageWidth - displayWidth) / 2;
            const y = (pageHeight - displayHeight) / 2;
            
            // Add page if not first image
            if (i > 0) {
                pdf.addPage([pageWidth, pageHeight], isLandscape ? 'landscape' : 'portrait');
            } else {
                pdf.setPage(0);
                pdf.internal.pageSize.width = pageWidth;
                pdf.internal.pageSize.height = pageHeight;
            }
            
            // Add border if enabled
            if (settings.border !== 'none') {
                const borderX = x - settings.borderWidth;
                const borderY = y - settings.borderWidth;
                const borderWidth = displayWidth + (settings.borderWidth * 2);
                const borderHeight = displayHeight + (settings.borderWidth * 2);
                
                pdf.setDrawColor(hexToRgb(settings.borderColor));
                pdf.setLineWidth(settings.borderWidth);
                
                if (settings.border === 'dashed') {
                    pdf.dashedLine(borderX, borderY, borderX + borderWidth, borderY);
                    pdf.dashedLine(borderX + borderWidth, borderY, borderX + borderWidth, borderY + borderHeight);
                    pdf.dashedLine(borderX + borderWidth, borderY + borderHeight, borderX, borderY + borderHeight);
                    pdf.dashedLine(borderX, borderY + borderHeight, borderX, borderY);
                } else if (settings.border === 'dotted') {
                    pdf.dottedLine(borderX, borderY, borderX + borderWidth, borderY);
                    pdf.dottedLine(borderX + borderWidth, borderY, borderX + borderWidth, borderY + borderHeight);
                    pdf.dottedLine(borderX + borderWidth, borderY + borderHeight, borderX, borderY + borderHeight);
                    pdf.dottedLine(borderX, borderY + borderHeight, borderX, borderY);
                } else {
                    pdf.rect(borderX, borderY, borderWidth, borderHeight);
                }
            }
            
            // Add image to PDF
            const quality = getCompressionQuality(settings.compression);
            pdf.addImage(img, 'JPEG', x, y, displayWidth, displayHeight, undefined, 'FAST', 0, quality);
            
            // Update progress
            processed++;
            const progress = Math.round((processed / totalImages) * 100);
            progressBarFill.style.width = `${progress}%`;
            progressText.textContent = `${progress}%`;
        }
        
        // Save PDF
        pdf.save(settings.outputName);
        
        // Reset progress
        setTimeout(() => {
            progressBar.classList.add('hidden');
        }, 1000);
    }
    
    // Convert images to contact sheet PDF
    async function convertToContactSheet(images, settings) {
        const pdf = new jsPDF();
        const totalImages = images.length;
        let processed = 0;
        
        // Calculate page dimensions
        const pageDimensions = getPageDimensions(settings);
        const pageWidth = pageDimensions.width;
        const pageHeight = pageDimensions.height;
        
        // Calculate cell dimensions
        const marginMM = settings.margin;
        const spacingMM = settings.spacing;
        const columns = settings.columns;
        const rows = settings.rows;
        
        const totalHorizontalSpacing = (columns - 1) * spacingMM + (marginMM * 2);
        const totalVerticalSpacing = (rows - 1) * spacingMM + (marginMM * 2);
        
        const cellWidth = (pageWidth - totalHorizontalSpacing) / columns;
        const cellHeight = (pageHeight - totalVerticalSpacing) / rows;
        
        let currentPage = 0;
        let currentRow = 0;
        let currentCol = 0;
        
        for (let i = 0; i < images.length; i++) {
            const image = images[i];
            const imageUrl = await readFileAsDataURL(image);
            const img = await loadImage(imageUrl);
            
            // Add new page if needed
            if (currentRow === 0 && currentCol === 0 && i > 0) {
                pdf.addPage([pageWidth, pageHeight], 'portrait');
                currentPage++;
            }
            
            // Calculate position for current cell
            const x = marginMM + (currentCol * (cellWidth + spacingMM));
            const y = marginMM + (currentRow * (cellHeight + spacingMM));
            
            // Calculate image dimensions to fit cell while maintaining aspect ratio
            const aspectRatio = img.width / img.height;
            let displayWidth, displayHeight;
            
            if (aspectRatio > 1) {
                // Landscape image
                displayWidth = cellWidth;
                displayHeight = cellWidth / aspectRatio;
                
                if (displayHeight > cellHeight) {
                    displayHeight = cellHeight;
                    displayWidth = cellHeight * aspectRatio;
                }
            } else {
                // Portrait or square image
                displayHeight = cellHeight;
                displayWidth = cellHeight * aspectRatio;
                
                if (displayWidth > cellWidth) {
                    displayWidth = cellWidth;
                    displayHeight = cellWidth / aspectRatio;
                }
            }
            
            // Center image in cell
            const centerX = x + (cellWidth - displayWidth) / 2;
            const centerY = y + (cellHeight - displayHeight) / 2;
            
            // Add border if enabled
            if (settings.border !== 'none') {
                const borderX = centerX - settings.borderWidth;
                const borderY = centerY - settings.borderWidth;
                const borderWidth = displayWidth + (settings.borderWidth * 2);
                const borderHeight = displayHeight + (settings.borderWidth * 2);
                
                pdf.setDrawColor(hexToRgb(settings.borderColor));
                pdf.setLineWidth(settings.borderWidth);
                
                if (settings.border === 'dashed') {
                    pdf.dashedLine(borderX, borderY, borderX + borderWidth, borderY);
                    pdf.dashedLine(borderX + borderWidth, borderY, borderX + borderWidth, borderY + borderHeight);
                    pdf.dashedLine(borderX + borderWidth, borderY + borderHeight, borderX, borderY + borderHeight);
                    pdf.dashedLine(borderX, borderY + borderHeight, borderX, borderY);
                } else if (settings.border === 'dotted') {
                    pdf.dottedLine(borderX, borderY, borderX + borderWidth, borderY);
                    pdf.dottedLine(borderX + borderWidth, borderY, borderX + borderWidth, borderY + borderHeight);
                    pdf.dottedLine(borderX + borderWidth, borderY + borderHeight, borderX, borderY + borderHeight);
                    pdf.dottedLine(borderX, borderY + borderHeight, borderX, borderY);
                } else {
                    pdf.rect(borderX, borderY, borderWidth, borderHeight);
                }
            }
            
            // Add image to PDF
            const quality = getCompressionQuality(settings.compression);
            pdf.addImage(img, 'JPEG', centerX, centerY, displayWidth, displayHeight, undefined, 'FAST', 0, quality);
            
            // Move to next cell
            currentCol++;
            if (currentCol >= columns) {
                currentCol = 0;
                currentRow++;
                
                if (currentRow >= rows) {
                    currentRow = 0;
                }
            }
            
            // Update progress
            processed++;
            const progress = Math.round((processed / totalImages) * 100);
            progressBarFill.style.width = `${progress}%`;
            progressText.textContent = `${progress}%`;
        }
        
        // Save PDF
        pdf.save(settings.outputName);
        
        // Reset progress
        setTimeout(() => {
            progressBar.classList.add('hidden');
        }, 1000);
    }
    
    // Convert images to double page spread
    async function convertToDoubleSpread(images, settings) {
        const pdf = new jsPDF();
        const totalImages = images.length;
        let processed = 0;
        
        // Calculate page dimensions (double width for spread)
        const pageDimensions = getPageDimensions(settings);
        const pageWidth = pageDimensions.width * 2;
        const pageHeight = pageDimensions.height;
        
        // Process images two at a time
        for (let i = 0; i < images.length; i += 2) {
            const image1 = images[i];
            const image2 = i + 1 < images.length ? images[i + 1] : null;
            
            // Add new page if not first page
            if (i > 0) {
                pdf.addPage([pageWidth, pageHeight], 'landscape');
            } else {
                pdf.setPage(0);
                pdf.internal.pageSize.width = pageWidth;
                pdf.internal.pageSize.height = pageHeight;
            }
            
            // Process first image (left page)
            const imageUrl1 = await readFileAsDataURL(image1);
            const img1 = await loadImage(imageUrl1);
            
            // Calculate dimensions for left image
            const leftMargin = settings.margin;
            const rightMargin = settings.margin / 2; // Half margin between pages
            const availableWidth = pageDimensions.width - leftMargin - rightMargin;
            const availableHeight = pageHeight - (settings.margin * 2);
            
            const aspectRatio1 = img1.width / img1.height;
            let displayWidth1, displayHeight1;
            
            if (aspectRatio1 > 1) {
                // Landscape image
                displayWidth1 = availableWidth;
                displayHeight1 = availableWidth / aspectRatio1;
                
                if (displayHeight1 > availableHeight) {
                    displayHeight1 = availableHeight;
                    displayWidth1 = availableHeight * aspectRatio1;
                }
            } else {
                // Portrait or square image
                displayHeight1 = availableHeight;
                displayWidth1 = availableHeight * aspectRatio1;
                
                if (displayWidth1 > availableWidth) {
                    displayWidth1 = availableWidth;
                    displayHeight1 = availableWidth / aspectRatio1;
                }
            }
            
            // Position left image
            const x1 = leftMargin + (availableWidth - displayWidth1) / 2;
            const y1 = settings.margin + (availableHeight - displayHeight1) / 2;
            
            // Add border for left image if enabled
            if (settings.border !== 'none') {
                const borderX1 = x1 - settings.borderWidth;
                const borderY1 = y1 - settings.borderWidth;
                const borderWidth1 = displayWidth1 + (settings.borderWidth * 2);
                const borderHeight1 = displayHeight1 + (settings.borderWidth * 2);
                
                pdf.setDrawColor(hexToRgb(settings.borderColor));
                pdf.setLineWidth(settings.borderWidth);
                
                if (settings.border === 'dashed') {
                    pdf.dashedLine(borderX1, borderY1, borderX1 + borderWidth1, borderY1);
                    pdf.dashedLine(borderX1 + borderWidth1, borderY1, borderX1 + borderWidth1, borderY1 + borderHeight1);
                    pdf.dashedLine(borderX1 + borderWidth1, borderY1 + borderHeight1, borderX1, borderY1 + borderHeight1);
                    pdf.dashedLine(borderX1, borderY1 + borderHeight1, borderX1, borderY1);
                } else if (settings.border === 'dotted') {
                    pdf.dottedLine(borderX1, borderY1, borderX1 + borderWidth1, borderY1);
                    pdf.dottedLine(borderX1 + borderWidth1, borderY1, borderX1 + borderWidth1, borderY1 + borderHeight1);
                    pdf.dottedLine(borderX1 + borderWidth1, borderY1 + borderHeight1, borderX1, borderY1 + borderHeight1);
                    pdf.dottedLine(borderX1, borderY1 + borderHeight1, borderX1, borderY1);
                } else {
                    pdf.rect(borderX1, borderY1, borderWidth1, borderHeight1);
                }
            }
            
            // Add left image to PDF
            const quality = getCompressionQuality(settings.compression);
            pdf.addImage(img1, 'JPEG', x1, y1, displayWidth1, displayHeight1, undefined, 'FAST', 0, quality);
            
            // Process second image if exists (right page)
            if (image2) {
                const imageUrl2 = await readFileAsDataURL(image2);
                const img2 = await loadImage(imageUrl2);
                
                // Calculate dimensions for right image
                const leftMargin2 = settings.margin / 2; // Half margin between pages
                const rightMargin2 = settings.margin;
                const availableWidth2 = pageDimensions.width - leftMargin2 - rightMargin2;
                
                const aspectRatio2 = img2.width / img2.height;
                let displayWidth2, displayHeight2;
                
                if (aspectRatio2 > 1) {
                    // Landscape image
                    displayWidth2 = availableWidth2;
                    displayHeight2 = availableWidth2 / aspectRatio2;
                    
                    if (displayHeight2 > availableHeight) {
                        displayHeight2 = availableHeight;
                        displayWidth2 = availableHeight * aspectRatio2;
                    }
                } else {
                    // Portrait or square image
                    displayHeight2 = availableHeight;
                    displayWidth2 = availableHeight * aspectRatio2;
                    
                    if (displayWidth2 > availableWidth2) {
                        displayWidth2 = availableWidth2;
                        displayHeight2 = availableWidth2 / aspectRatio2;
                    }
                }
                
                // Position right image
                const x2 = pageDimensions.width + leftMargin2 + (availableWidth2 - displayWidth2) / 2;
                const y2 = settings.margin + (availableHeight - displayHeight2) / 2;
                
                // Add border for right image if enabled
                if (settings.border !== 'none') {
                    const borderX2 = x2 - settings.borderWidth;
                    const borderY2 = y2 - settings.borderWidth;
                    const borderWidth2 = displayWidth2 + (settings.borderWidth * 2);
                    const borderHeight2 = displayHeight2 + (settings.borderWidth * 2);
                    
                    pdf.setDrawColor(hexToRgb(settings.borderColor));
                    pdf.setLineWidth(settings.borderWidth);
                    
                    if (settings.border === 'dashed') {
                        pdf.dashedLine(borderX2, borderY2, borderX2 + borderWidth2, borderY2);
                        pdf.dashedLine(borderX2 + borderWidth2, borderY2, borderX2 + borderWidth2, borderY2 + borderHeight2);
                        pdf.dashedLine(borderX2 + borderWidth2
                        // Helper function to read file as data URL
function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Helper function to load image and get dimensions
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

// Helper function to convert hex color to RGB
function hexToRgb(hex) {
    const r = parseInt(hex.substring(1, 3), 16);
    const g = parseInt(hex.substring(3, 5), 16);
    const b = parseInt(hex.substring(5, 7), 16);
    return [r, g, b];
}

// Helper function to get page dimensions based on settings
function getPageDimensions(settings) {
    let width, height;
    
    switch(settings.pageSize) {
        case 'a4':
            width = 210;
            height = 297;
            break;
        case 'letter':
            width = 215.9;
            height = 279.4;
            break;
        case 'legal':
            width = 215.9;
            height = 355.6;
            break;
        case 'custom':
            width = settings.customWidth;
            height = settings.customHeight;
            break;
        default:
            width = 210;
            height = 297;
    }
    
    return { width, height };
}

// Helper function to get compression quality
function getCompressionQuality(level) {
    switch(level) {
        case 'high': return 1.0;
        case 'medium': return 0.75;
        case 'low': return 0.5;
        default: return 0.75;
    }
}