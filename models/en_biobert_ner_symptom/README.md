---
tags:
- spacy
- token-classification
language:
- en
license: mit
model-index:
- name: en_biobert_ner_symptom
  results:
  - task:
      name: NER
      type: token-classification
    metrics:
    - name: NER Precision
      type: precision
      value: 0.9997017596
    - name: NER Recall
      type: recall
      value: 0.9994036971
    - name: NER F Score
      type: f_score
      value: 0.9995527061
widget:
- text: "Patient X reported coughing and sneezing."
  example_title: "Example 1"
- text: "There was a case of rash and inflammation."
  example_title: "Example 2"
- text: "He complained of dizziness during the trip."
  example_title: "Example 3"
- text: "I felt distressed , giddy and nauseous during my stay in Florida."
  example_title: "Example 4"
- text: "Mr. Y complained of breathlessness and chest pain when he was driving back to his house."
  example_title: "Example 5"
---
Fine-tuned BioBERT based NER model for detecting medical symptoms from clinical notes.

| Feature | Description |
| --- | --- |
| **Name** | `en_biobert_ner_symptom` |
| **Version** | `1.0.0` |
| **spaCy** | `>=3.5.1,<3.6.0` |
| **Default Pipeline** | `transformer`, `ner` |
| **Components** | `transformer`, `ner` |
| **Vectors** | 0 keys, 0 unique vectors (0 dimensions) |
| **Sources** | n/a |
| **License** | `MIT` |
| **Author** | [Sena Chae, Pratik Maitra, Padmini Srinivasan]() |



## Model Description 

The model was trained on a combined maccrobat and i2c2 dataset and is based on biobert. If you use this model kindly cite the paper below:

<b>
<i>  
Uncovering Hidden Symptom Clusters in Patients with Acute Myeloid Leukemia using Natural Language Processing - Sena Chae, Jaewon Bae , Pratik Matira, Karen Dunn Lopez, Barbara Rakel
</i>
</b>

## Model Usage
The model can be loaded using spacy after installing the model. 
```
!pip install https://huggingface.co/pmaitra/en_biobert_ner_symptom/resolve/main/en_biobert_ner_symptom-any-py3-none-any.whl
```
A sample use-case is presented below:

```python

import spacy
nlp = spacy.load("en_biobert_ner_symptom")

doc = nlp("He complained of dizziness and nausea during the Iowa trip.")

for ent in doc.ents:
  print(ent)


```


### Accuracy

| Type | Score |
| --- | --- |
| `ENTS_F` | 99.96 |
| `ENTS_P` | 99.97 |
| `ENTS_R` | 99.94 |
| `TRANSFORMER_LOSS` | 20456.83 |
| `NER_LOSS` | 38920.06 |