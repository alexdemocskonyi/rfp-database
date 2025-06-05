python3 -c "
import json, os
import pandas as pd
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

model = SentenceTransformer('all-MiniLM-L6-v2')
file_path = '/Users/alex.democskonyi/Downloads/rfp search - final/Final_RFP_Q_A_Cleaned_Questions.xlsx'

df = pd.read_excel(file_path)
df['full_text'] = df['Question'].astype(str).str.strip()

df['embedding'] = df['full_text'].apply(lambda x: model.encode(x).tolist())

# Consolidate multiple answers for the same question
merged = df.groupby('Question').agg({
    'Answer': lambda a: list(a),
    'embedding': 'first'
}).reset_index()

output = []
for _, row in merged.iterrows():
    output.append({
        'question': row['Question'],
        'answers': row['Answer'],
        'embedding': row['embedding']
    })

output_path = '/Users/alex.democskonyi/Downloads/rfp search - final/rfp_data_with_local_embeddings.json'
with open(output_path, 'w') as f:
    json.dump(output, f, indent=2)

print(f'✅ Done. JSON saved to: {output_path}')
"
