import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import glob
import os

def generate_plots():
    # Find latest benchmark result
    csv_files = glob.glob('results/*.csv')
    if not csv_files:
        print("No benchmark results found. Run benchmark_runner.py first.")
        return
        
    latest_file = max(csv_files, key=os.path.getctime)
    df = pd.read_csv(latest_file)
    
    os.makedirs("plots", exist_ok=True)
    
    # Plot 1: NPS vs Depth for Alpha-Beta (with and without Move Ordering)
    ab_df = df[df['engine'] == 'alphabeta']
    plt.figure(figsize=(10, 6))
    sns.lineplot(data=ab_df, x='param_1_val', y='nodes', hue='param_2_val', marker='o')
    plt.title('Nodes Evaluated vs. Depth (Alpha-Beta)')
    plt.xlabel('Search Depth')
    plt.ylabel('Nodes Evaluated (Log Scale)')
    plt.yscale('log')
    plt.legend(title='Move Ordering (MVV-LVA)')
    plt.grid(True, which="both", ls="--", alpha=0.2)
    plt.savefig('plots/ab_nodes_vs_depth.png')
    plt.close()
    
    # Plot 2: Time vs Iterations for MCTS
    mcts_df = df[df['engine'] == 'mcts']
    plt.figure(figsize=(10, 6))
    sns.lineplot(data=mcts_df, x='param_1_val', y='time_ms', hue='param_2_val', marker='s')
    plt.title('Execution Time vs. Iterations (MCTS)')
    plt.xlabel('Number of Simulations (Rollouts)')
    plt.ylabel('Time taken (ms)')
    plt.legend(title='Exploration Constant (c)')
    plt.grid(True, alpha=0.3)
    plt.savefig('plots/mcts_time_vs_iterations.png')
    plt.close()
    
    # Plot 3: NPS Comparison AB vs MCTS
    plt.figure(figsize=(8, 6))
    sns.barplot(data=df, x='engine', y='nps', errorbar='sd', palette='viridis')
    plt.title('Average Nodes Per Second (NPS) Comparison')
    plt.xlabel('Engine Type')
    plt.ylabel('Average NPS')
    plt.yscale('log') # NPS is drastically different
    plt.savefig('plots/nps_comparison.png')
    plt.close()
    
    print("Academic charts generated in /plots directory.")

if __name__ == "__main__":
    generate_plots()
