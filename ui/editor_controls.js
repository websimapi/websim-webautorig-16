export class EditorControls {
    constructor(handlers) {
        this.handlers = handlers;
        this.skeletonVisible = false;
        this.meshVisible = true;
        this.setupButtons();
        
        this.errorContainer = document.getElementById('error-container');
        this.errorMessageSpan = document.getElementById('error-message');
        this.copyErrorBtn = document.getElementById('copy-error-btn');
        this.clearErrorBtn = document.getElementById('clear-error-btn');

        this.clearErrorBtn?.addEventListener('click', () => this.hideError());
        this.copyErrorBtn?.addEventListener('click', () => this.copyError());
    }

    setupButtons() {
        // Desktop buttons
        document.getElementById('rig-btn').addEventListener('click', this.handlers.onRig);
        document.getElementById('reset-view-btn').addEventListener('click', this.handlers.onResetView);
        document.getElementById('auto-detect-btn').addEventListener('click', this.handlers.onAutoDetect);
        document.getElementById('editor-skeleton-toggle').addEventListener('change', (e) => this.toggleSkeleton(e.target.checked));
        document.getElementById('editor-mesh-toggle').addEventListener('change', (e) => this.toggleMesh(e.target.checked));
        
        // Mobile buttons
        document.getElementById('mobile-rig-btn').addEventListener('click', this.handlers.onRig);
        document.getElementById('mobile-reset-view-btn').addEventListener('click', this.handlers.onResetView);
        document.getElementById('mobile-auto-detect-btn').addEventListener('click', this.handlers.onAutoDetect);
        document.getElementById('mobile-show-skeleton-btn').addEventListener('click', () => this.toggleSkeleton());
        document.getElementById('mobile-show-mesh-btn').addEventListener('click', () => this.toggleMesh());

        // Setup mobile action button icons
        document.getElementById('mobile-auto-detect-btn').style.backgroundImage = `url(./icon_auto_detect.png)`;
        document.getElementById('mobile-reset-view-btn').style.backgroundImage = `url(./icon_reset_view.png)`;
        document.getElementById('mobile-rig-btn').style.backgroundImage = `url(./icon_generate_rig.png)`;
        document.getElementById('mobile-show-skeleton-btn').style.backgroundImage = `url(./icon_skeleton.png)`;
        document.getElementById('mobile-show-mesh-btn').style.backgroundImage = `url(./icon_mesh.png)`;
    }

    toggleSkeleton(forceState) {
        this.skeletonVisible = forceState !== undefined ? forceState : !this.skeletonVisible;
        this.handlers.onSkeletonToggle(this.skeletonVisible);
        this.updateSkeletonUI(this.skeletonVisible);
    }
    
    toggleMesh(forceState) {
        this.meshVisible = forceState !== undefined ? forceState : !this.meshVisible;
        this.handlers.onMeshToggle(this.meshVisible);
        this.updateMeshUI(this.meshVisible);
    }
    
    updateSkeletonUI(visible) {
        document.getElementById('mobile-show-skeleton-btn').classList.toggle('active', visible);
        document.getElementById('editor-skeleton-toggle').checked = visible;
        this.skeletonVisible = visible;
    }

    updateMeshUI(visible) {
        document.getElementById('mobile-show-mesh-btn').classList.toggle('active', visible);
        document.getElementById('editor-mesh-toggle').checked = visible;
        this.meshVisible = visible;
    }

    setRigButtonEnabled(enabled) {
        document.getElementById('rig-btn').disabled = !enabled;
        document.getElementById('mobile-rig-btn').disabled = !enabled;
    }

    showProgress(progress, label) {
        const container = document.querySelector('.progress-container');
        const progressLabel = document.getElementById('progress-label');
        const progressBar = document.getElementById('progress-bar');
        
        this.hideError();
        container.style.display = 'block';
        progressBar.value = progress * 100;
        progressLabel.textContent = label;
    }

    hideProgress() {
        document.querySelector('.progress-container').style.display = 'none';
    }

    showError(error) {
        this.hideProgress();
        this.errorMessageSpan.textContent = error.message || String(error);
        this.errorContainer.style.display = 'block';
    }

    hideError() {
        if (this.errorContainer) {
            this.errorContainer.style.display = 'none';
        }
    }

    copyError() {
        const errorText = this.errorMessageSpan.textContent;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(errorText).then(() => {
                alert('Error copied to clipboard!');
            }).catch(err => {
                console.error('Failed to copy error: ', err);
                alert('Failed to copy error.');
            });
        } else {
            alert('Clipboard API not available. Please copy the text manually.');
        }
    }

    setButtonsEnabled(enabled) {
        document.getElementById('auto-detect-btn').disabled = !enabled;
        document.getElementById('mobile-auto-detect-btn').disabled = !enabled;
        document.getElementById('rig-btn').disabled = !enabled;
        document.getElementById('mobile-rig-btn').disabled = !enabled;
    }
}