use cliffy_alive::evolution::{EvolutionEngine, EvolutionStrategy, FitnessMetrics, MutationType};
use cliffy_alive::ui_cell::{UICell, UICellType, CellGenome};
use std::collections::HashMap;

#[test]
fn test_fitness_based_selection() {
    let mut evolution = EvolutionEngine::new();
    
    // Create population with varying fitness
    let mut population: Vec<UICell> = (0..20)
        .map(|i| {
            let mut cell = UICell::new(UICellType::Generic);
            cell.set_fitness(i as f64); // Varying fitness
            cell
        })
        .collect();
    
    // Run selection
    evolution.selection(&mut population);
    
    // High fitness cells should survive
    let survivors: Vec<_> = population.iter()
        .filter(|c| !c.marked_for_death())
        .collect();
    
    let avg_fitness = survivors.iter()
        .map(|c| c.fitness())
        .sum::<f64>() / survivors.len() as f64;
    
    assert!(avg_fitness > 10.0); // Above median
}

#[test]
fn test_dna_crossover() {
    let parent_a = UICell::new(UICellType::ButtonCore);
    let parent_b = UICell::new(UICellType::ButtonCore);
    
    let evolution = EvolutionEngine::new();
    let child = evolution.crossover(&parent_a, &parent_b);
    
    // Child should inherit traits from both parents
    assert!(child.dna.has_genes_from(&parent_a.dna));
    assert!(child.dna.has_genes_from(&parent_b.dna));
}

#[test]
fn test_mutation() {
    let cell = UICell::new(UICellType::Generic);
    let original_dna = cell.dna.clone();
    
    let evolution = EvolutionEngine::new();
    let mutated = evolution.mutate(cell, 0.1); // 10% mutation rate
    
    // Should have some differences
    assert_ne!(mutated.dna, original_dna);
    
    // But still be similar
    let similarity = mutated.dna.similarity_to(&original_dna);
    assert!(similarity > 0.8);
}

#[test]
fn test_tournament_selection() {
    let mut evolution = EvolutionEngine::new();
    evolution.set_selection_method(SelectionMethod::Tournament { size: 3 });
    
    let mut population: Vec<UICell> = (0..50)
        .map(|i| {
            let mut cell = UICell::new(UICellType::Generic);
            cell.set_fitness((i % 10) as f64); // Varied fitness distribution
            cell
        })
        .collect();
    
    let selected = evolution.tournament_select(&population, 10);
    
    // Tournament selection should favor higher fitness
    let avg_selected_fitness = selected.iter()
        .map(|c| c.fitness())
        .sum::<f64>() / selected.len() as f64;
    
    let avg_population_fitness = population.iter()
        .map(|c| c.fitness())
        .sum::<f64>() / population.len() as f64;
    
    assert!(avg_selected_fitness >= avg_population_fitness);
}

#[test]
fn test_roulette_wheel_selection() {
    let mut evolution = EvolutionEngine::new();
    evolution.set_selection_method(SelectionMethod::RouletteWheel);
    
    let mut population: Vec<UICell> = vec![
        {
            let mut cell = UICell::new(UICellType::Generic);
            cell.set_fitness(10.0);
            cell
        },
        {
            let mut cell = UICell::new(UICellType::Generic);
            cell.set_fitness(5.0);
            cell
        },
        {
            let mut cell = UICell::new(UICellType::Generic);
            cell.set_fitness(1.0);
            cell
        },
    ];
    
    // Run selection many times
    let mut selection_counts = HashMap::new();
    for _ in 0..1000 {
        let selected = evolution.roulette_select(&population);
        let fitness = selected.fitness();
        *selection_counts.entry(fitness as i32).or_insert(0) += 1;
    }
    
    // Higher fitness should be selected more often
    assert!(selection_counts.get(&10).unwrap_or(&0) > selection_counts.get(&1).unwrap_or(&0));
}

#[test]
fn test_different_mutation_types() {
    let original_cell = UICell::new(UICellType::Generic);
    let evolution = EvolutionEngine::new();
    
    // Test point mutation
    let point_mutated = evolution.apply_mutation(&original_cell, MutationType::Point { rate: 0.1 });
    
    // Test gaussian mutation
    let gaussian_mutated = evolution.apply_mutation(&original_cell, MutationType::Gaussian { 
        mean: 0.0, 
        std_dev: 0.1 
    });
    
    // Test uniform mutation
    let uniform_mutated = evolution.apply_mutation(&original_cell, MutationType::Uniform { 
        min: -0.1, 
        max: 0.1 
    });
    
    // All should be different from original
    assert_ne!(point_mutated.dna, original_cell.dna);
    assert_ne!(gaussian_mutated.dna, original_cell.dna);
    assert_ne!(uniform_mutated.dna, original_cell.dna);
    
    // But should maintain similarity
    assert!(point_mutated.dna.similarity_to(&original_cell.dna) > 0.8);
    assert!(gaussian_mutated.dna.similarity_to(&original_cell.dna) > 0.8);
    assert!(uniform_mutated.dna.similarity_to(&original_cell.dna) > 0.8);
}

#[test]
fn test_evolution_strategies() {
    let mut evolution = EvolutionEngine::new();
    
    // Test natural selection strategy
    evolution.set_strategy(EvolutionStrategy::NaturalSelection);
    let mut population = create_test_population(20);
    
    evolution.evolve_generation(&mut population);
    let natural_avg_fitness = average_fitness(&population);
    
    // Test directed evolution strategy
    evolution.set_strategy(EvolutionStrategy::DirectedEvolution { 
        target_traits: {
            let mut traits = HashMap::new();
            traits.insert("energy_efficiency".to_string(), 0.9);
            traits.insert("cooperation".to_string(), 0.8);
            traits
        }
    });
    
    let mut directed_population = create_test_population(20);
    evolution.evolve_generation(&mut directed_population);
    
    // Directed evolution should target specific traits
    let avg_efficiency = directed_population.iter()
        .map(|c| c.dna.traits.get("energy_efficiency").unwrap_or(&0.0))
        .sum::<f64>() / directed_population.len() as f64;
    
    assert!(avg_efficiency > 0.5);
}

#[test]
fn test_fitness_metrics_calculation() {
    let mut cell = UICell::new(UICellType::ButtonCore);
    
    // Set up interaction history
    cell.record_interaction("click", 1.0);
    cell.record_interaction("hover", 0.5);
    cell.record_interaction("focus", 0.3);
    
    // Set energy and age
    cell.set_energy(75.0);
    cell.set_age(10.0);
    
    let metrics = FitnessMetrics::calculate(&cell);
    
    // Fitness should consider multiple factors
    assert!(metrics.user_engagement > 0.0);
    assert!(metrics.energy_efficiency > 0.0);
    assert!(metrics.survival_time > 0.0);
    assert!(metrics.overall_fitness > 0.0);
    
    // Overall fitness should be composite
    let expected_fitness = (metrics.user_engagement + metrics.energy_efficiency + metrics.survival_time) / 3.0;
    assert!((metrics.overall_fitness - expected_fitness).abs() < 0.1);
}

#[test]
fn test_adaptive_mutation_rate() {
    let mut evolution = EvolutionEngine::new();
    evolution.enable_adaptive_mutation(true);
    
    let mut stagnant_population = create_uniform_population(20, 5.0); // All same fitness
    let mut diverse_population = create_test_population(20); // Diverse fitness
    
    let stagnant_rate = evolution.calculate_adaptive_mutation_rate(&stagnant_population);
    let diverse_rate = evolution.calculate_adaptive_mutation_rate(&diverse_population);
    
    // Stagnant populations should have higher mutation rates
    assert!(stagnant_rate > diverse_rate);
    assert!(stagnant_rate > 0.05);
    assert!(diverse_rate < 0.05);
}

#[test]
fn test_elitism() {
    let mut evolution = EvolutionEngine::new();
    evolution.set_elitism_rate(0.2); // Keep top 20%
    
    let mut population = create_test_population(20);
    
    // Find top performers before evolution
    population.sort_by(|a, b| b.fitness().partial_cmp(&a.fitness()).unwrap());
    let elite_ids: Vec<_> = population[0..4].iter().map(|c| c.id()).collect();
    
    // Evolve generation
    evolution.evolve_generation(&mut population);
    
    // Elite should still be present
    let surviving_ids: Vec<_> = population.iter().map(|c| c.id()).collect();
    let elite_survived = elite_ids.iter().filter(|id| surviving_ids.contains(id)).count();
    
    assert!(elite_survived >= 3); // Most elite should survive
}

#[test]
fn test_hybrid_evolution_strategy() {
    let mut evolution = EvolutionEngine::new();
    
    let hybrid_strategy = EvolutionStrategy::Hybrid {
        strategies: vec![
            EvolutionStrategy::NaturalSelection,
            EvolutionStrategy::DirectedEvolution {
                target_traits: {
                    let mut traits = HashMap::new();
                    traits.insert("cooperation".to_string(), 0.8);
                    traits
                }
            }
        ]
    };
    
    evolution.set_strategy(hybrid_strategy);
    
    let mut population = create_test_population(30);
    let initial_cooperation = average_trait_value(&population, "cooperation");
    
    // Run several generations
    for _ in 0..10 {
        evolution.evolve_generation(&mut population);
    }
    
    let final_cooperation = average_trait_value(&population, "cooperation");
    
    // Cooperation should improve due to directed component
    assert!(final_cooperation > initial_cooperation);
}

#[test]
fn test_genetic_diversity_maintenance() {
    let mut evolution = EvolutionEngine::new();
    evolution.enable_diversity_maintenance(true);
    evolution.set_min_diversity_threshold(0.3);
    
    let mut population = create_test_population(25);
    let initial_diversity = calculate_genetic_diversity(&population);
    
    // Run evolution for many generations
    for _ in 0..50 {
        evolution.evolve_generation(&mut population);
    }
    
    let final_diversity = calculate_genetic_diversity(&population);
    
    // Diversity should be maintained above threshold
    assert!(final_diversity > 0.3);
    assert!(final_diversity > initial_diversity * 0.7); // Not too much loss
}

// Helper functions
fn create_test_population(size: usize) -> Vec<UICell> {
    (0..size)
        .map(|i| {
            let mut cell = UICell::new(UICellType::Generic);
            cell.set_fitness(i as f64 % 10);
            cell.dna.traits.insert("energy_efficiency".to_string(), (i % 10) as f64 / 10.0);
            cell.dna.traits.insert("cooperation".to_string(), ((i + 3) % 7) as f64 / 7.0);
            cell
        })
        .collect()
}

fn create_uniform_population(size: usize, fitness: f64) -> Vec<UICell> {
    (0..size)
        .map(|_| {
            let mut cell = UICell::new(UICellType::Generic);
            cell.set_fitness(fitness);
            cell
        })
        .collect()
}

fn average_fitness(population: &[UICell]) -> f64 {
    population.iter().map(|c| c.fitness()).sum::<f64>() / population.len() as f64
}

fn average_trait_value(population: &[UICell], trait_name: &str) -> f64 {
    let sum: f64 = population.iter()
        .map(|c| c.dna.traits.get(trait_name).unwrap_or(&0.0))
        .sum();
    sum / population.len() as f64
}

fn calculate_genetic_diversity(population: &[UICell]) -> f64 {
    let mut diversity_sum = 0.0;
    let n = population.len();
    
    for i in 0..n {
        for j in (i+1)..n {
            diversity_sum += 1.0 - population[i].dna.similarity_to(&population[j].dna);
        }
    }
    
    diversity_sum / ((n * (n - 1)) / 2) as f64
}