## System Design & Core Functionality

At its core, the project functions as a high-sensitivity, multi-staged automated triage pipeline for medical imaging. Instead of relying on a single neural network to make a definitive diagnosis, it divides the clinical task into three distinct phases:

### 1. Multi-Task Deep Feature Extraction & Segmentation

The system ingests high-resolution retinal fundus scans and processes them through customized Convolutional Neural Networks (CNNs). This layer performs two tasks simultaneously:

* **Segmentation:** It isolates key anatomical landmarks of the eye, specifically the optic disc and the optic cup. This allows the system to compute the vertical Cup-to-Disc Ratio (vCDR), a primary structural indicator used by ophthalmologists to evaluate nerve damage.
* **Feature Extraction:** The backbones capture abstract, low-level micro-textures and subtle structural changes in the neuroretinal rim that might be invisible to the naked eye or missed by standard calculations.

### 2. Intelligent Feature Fusion

The system creates a robust diagnostic profile for each image by combining the extracted spatial deep learning features with structural measurements (like the cup-to-disc ratio). Rather than forcing a deep learning network to handle the final tabular classification, these combined data vectors are fed into an optimized **XGBoost (Extreme Gradient Boosting)** classifier. XGBoost excels at analyzing combined tabular feature sets and capturing complex, non-linear relationships, which drastically improves the overall classification stability.

### 3. Hard Negative Mining

A major challenge in medical image classification is dealing with "borderline" cases—healthy eyes that exhibit natural physiological variations resembling early-stage glaucoma, which typically cause a high rate of false alarms. To counter this, the pipeline incorporates an active learning loop during training. It isolates these complex false positives (hard negatives) and feeds them back into specialist training subsets. This forces the model to learn the incredibly fine boundaries between healthy variations and true early-stage pathology.

---

## Clinical Objective & Deployment Impact

The primary operational goal of this system is **automated clinical triage**.

In high-volume screening environments, specialists spend significant time reviewing clear, healthy scans. By deploying this pipeline at the frontline of the workflow:

* **High-Sensitivity Filtering:** Operating at a **97.67% recall rate**, the system acts as a digital safety net. It is heavily weighted to prevent false negatives, ensuring that virtually every eye with potential glaucoma is captured.
* **Workflow Optimization:** Healthy scans can be safely flagged as low-priority, allowing ophthalmologists and clinical teams to focus their immediate attention, advanced diagnostics, and treatment resources on the urgent, high-risk cases identified by the ensemble.
