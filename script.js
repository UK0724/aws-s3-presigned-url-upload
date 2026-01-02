class FileUploader {
    constructor() {
        this.initializeElements();
        this.attachEventListeners();
        this.currentFile = null;
        this.apiEndpoint = 'https://lnxdptxk74.execute-api.us-east-1.amazonaws.com/dev'; // Replace with your API Gateway URL
    }

    initializeElements() {
        this.fileInput = document.getElementById('fileInput');
        this.fileLabelText = document.getElementById('fileLabelText');
        this.previewSection = document.getElementById('previewSection');
        this.previewContainer = document.getElementById('previewContainer');
        this.uploadBtn = document.getElementById('uploadBtn');
        this.progressSection = document.getElementById('progressSection');
        this.progressFill = document.getElementById('progressFill');
        this.statusText = document.getElementById('statusText');
        this.resultSection = document.getElementById('resultSection');
        this.resultContainer = document.getElementById('resultContainer');
        this.newUploadBtn = document.getElementById('newUploadBtn');
        this.errorSection = document.getElementById('errorSection');
        this.errorMessage = document.getElementById('errorMessage');
        this.retryBtn = document.getElementById('retryBtn');
    }

    attachEventListeners() {
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.uploadBtn.addEventListener('click', () => this.uploadFile());
        this.newUploadBtn.addEventListener('click', () => this.resetUploader());
        this.retryBtn.addEventListener('click', () => this.hideError());
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
            this.showError('Please select an image or video file.');
            return;
        }

        // Validate file size (100MB limit)
        if (file.size > 100 * 1024 * 1024) {
            this.showError('File size must be less than 100MB.');
            return;
        }

        this.currentFile = file;
        this.fileLabelText.textContent = file.name;
        this.showPreview(file);
    }

    showPreview(file) {
        const url = URL.createObjectURL(file);
        let element;

        if (file.type.startsWith('image/')) {
            element = document.createElement('img');
            element.src = url;
            element.alt = 'Preview';
        } else if (file.type.startsWith('video/')) {
            element = document.createElement('video');
            element.src = url;
            element.controls = true;
        }

        this.previewContainer.innerHTML = '';
        this.previewContainer.appendChild(element);
        this.previewSection.classList.remove('hidden');
        this.hideError();
    }

    async uploadFile() {
        if (!this.currentFile) return;

        try {
            this.showProgress();
            this.updateProgress(0, 'Getting upload URL...');

            // Get PUT pre-signed URL from API Gateway
            const { url, fileKey } = await this.getPresignedUploadUrl(this.currentFile);

            this.updateProgress(25, 'Uploading file...');

            // Upload file to S3
            await this.uploadToS3(url, this.currentFile);

            this.updateProgress(75, 'Finalizing upload...');

            // Get GET pre-signed URL
            const downloadUrl = await this.getPresignedDownloadUrl(fileKey);

            this.updateProgress(100, 'Upload complete!');

            // Show final preview from S3
            this.showResult(downloadUrl, this.currentFile.type);

        } catch (error) {
            console.error('Upload error:', error);
            this.showError('Upload failed: ' + (error.message || 'Unknown error'));
        }
    }

    async getPresignedUploadUrl(file) {
        const response = await fetch(`${this.apiEndpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size
            })
        });

        if (!response.ok) {
            throw new Error('Failed to get upload URL');
        }

        const data = await response.json();
        return {
            url: data.url,
            fileKey: data.key
        };
    }

    async uploadToS3(uploadUrl, file) {
        const response = await fetch(uploadUrl, {
            method: 'PUT',
            body: file
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('S3 Upload Error:', response.status, errorText);
            throw new Error(`Failed to upload file to S3: ${response.status} ${response.statusText}`);
        }
    }

    async getPresignedDownloadUrl(fileKey) {
        const response = await fetch(`${this.apiEndpoint}/?key=${fileKey}`);

        if (!response.ok) {
            throw new Error('Failed to get download URL');
        }

        const data = await response.json();
        return data.url;
    }

    showResult(downloadUrl, fileType) {
        let element;

        if (fileType.startsWith('image/')) {
            element = document.createElement('img');
            element.src = downloadUrl;
            element.alt = 'Uploaded file';
        } else if (fileType.startsWith('video/')) {
            element = document.createElement('video');
            element.src = downloadUrl;
            element.controls = true;
        }

        this.resultContainer.innerHTML = '';
        this.resultContainer.appendChild(element);
        
        // Add download link
        const downloadLink = document.createElement('a');
        downloadLink.href = downloadUrl;
        downloadLink.textContent = 'Download File';
        downloadLink.style.display = 'block';
        downloadLink.style.marginTop = '10px';
        downloadLink.style.color = '#667eea';
        downloadLink.style.textDecoration = 'none';
        this.resultContainer.appendChild(downloadLink);

        this.hideProgress();
        this.resultSection.classList.remove('hidden');
    }

    showProgress() {
        this.progressSection.classList.remove('hidden');
        this.uploadBtn.disabled = true;
        this.previewSection.style.opacity = '0.5';
    }

    hideProgress() {
        this.progressSection.classList.add('hidden');
        this.uploadBtn.disabled = false;
        this.previewSection.style.opacity = '1';
    }

    updateProgress(percentage, status) {
        this.progressFill.style.width = `${percentage}%`;
        this.statusText.textContent = status;
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorSection.classList.remove('hidden');
        this.hideProgress();
    }

    hideError() {
        this.errorSection.classList.add('hidden');
    }

    resetUploader() {
        this.currentFile = null;
        this.fileInput.value = '';
        this.fileLabelText.textContent = 'Choose file';
        this.previewSection.classList.add('hidden');
        this.resultSection.classList.add('hidden');
        this.hideError();
        this.hideProgress();
        URL.revokeObjectURL(this.previewContainer.firstChild?.src || '');
    }
}

// Initialize the uploader when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new FileUploader();
});
