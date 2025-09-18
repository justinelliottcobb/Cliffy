use cliffy_alive::ui_organism::{UIOrganismField, AliveConfig};
use cliffy_alive::ui_cell::{UICell, UICellType};
use cliffy_alive::metabolism::UITime;
use std::collections::HashMap;

#[test]
fn test_organism_manages_cell_population() {
    let mut organism = UIOrganismField::new();
    
    // Spawn initial cells
    organism.spawn_cell(UICellType::Header, 0.0, 0.0);
    organism.spawn_cell(UICellType::Content, 0.0, 100.0);
    
    assert_eq!(organism.population(), 2);
    
    // Run metabolic cycle
    organism.metabolic_cycle(0.016); // one frame at 60fps
    
    // Population can change based on needs
    // New cells spawn in empty niches, weak cells die
    assert!(organism.population() > 0);
}

#[test]
fn test_organism_evolution() {
    let mut organism = UIOrganismField::new();
    
    // Seed with random cells
    for _ in 0..10 {
        organism.spawn_random_cell();
    }
    
    let initial_fitness = organism.average_fitness();
    
    // Simulate user interactions
    for _ in 0..100 {
        organism.simulate_user_interaction();
        organism.evolve(0.016);
    }
    
    // Organism should adapt and improve
    assert!(organism.average_fitness() > initial_fitness);
}

#[test]
fn test_phase_transitions() {
    let mut organism = UIOrganismField::new();
    organism.populate_standard_ui();
    
    // Mobile phase
    organism.set_viewport(375, 667);
    organism.trigger_phase_transition();
    let mobile_layout = organism.get_layout_topology();
    
    // Desktop phase
    organism.set_viewport(1920, 1080);
    organism.trigger_phase_transition();
    let desktop_layout = organism.get_layout_topology();
    
    // Layouts should be fundamentally different
    assert_ne!(mobile_layout, desktop_layout);
}

#[test]
fn test_organism_energy_sources() {
    let mut organism = UIOrganismField::new();
    
    // Add energy sources
    organism.add_energy_source(100.0, 100.0, 50.0); // x, y, energy_rate
    organism.add_energy_source(300.0, 300.0, 75.0);
    
    // Spawn a cell near energy source
    organism.spawn_cell(UICellType::Generic, 105.0, 105.0);
    
    let initial_energy = organism.get_cell_at(105.0, 105.0).unwrap().energy();
    
    // Run metabolic cycle
    organism.metabolic_cycle(1.0);
    
    let final_energy = organism.get_cell_at(105.0, 105.0).unwrap().energy();
    
    // Cell should have gained energy from nearby source
    assert!(final_energy > initial_energy);
}

#[test]
fn test_organism_selection_pressure() {
    let mut organism = UIOrganismField::new();
    
    // Set selection pressure for efficiency
    organism.set_selection_pressure("energy_efficiency", 0.8);
    organism.set_selection_pressure("user_engagement", 0.6);
    
    // Spawn cells with different traits
    for i in 0..20 {
        let mut cell = UICell::new(UICellType::Generic);
        cell.dna.traits.insert("energy_efficiency".to_string(), i as f64 / 20.0);
        organism.add_cell(cell, i as f64 * 10.0, i as f64 * 10.0);
    }
    
    let initial_avg_efficiency = organism.average_trait_value("energy_efficiency");
    
    // Run evolution cycles
    for _ in 0..50 {
        organism.evolve(0.1);
    }
    
    let final_avg_efficiency = organism.average_trait_value("energy_efficiency");
    
    // Average efficiency should increase due to selection pressure
    assert!(final_avg_efficiency > initial_avg_efficiency);
}

#[test]
fn test_organism_spatial_organization() {
    let mut organism = UIOrganismField::new();
    
    // Spawn related cells
    organism.spawn_cell(UICellType::DataDisplay, 100.0, 100.0);
    organism.spawn_cell(UICellType::DataVisualization, 110.0, 110.0);
    organism.spawn_cell(UICellType::Navigation, 500.0, 500.0);
    
    // Set genetic affinities
    organism.set_global_affinity(UICellType::DataDisplay, UICellType::DataVisualization, 0.8);
    organism.set_global_affinity(UICellType::DataDisplay, UICellType::Navigation, -0.2);
    
    // Run spatial organization
    for _ in 0..100 {
        organism.spatial_step(0.016);
    }
    
    // Related cells should be closer together
    let data_pos = organism.find_cell_by_type(UICellType::DataDisplay).unwrap().position();
    let viz_pos = organism.find_cell_by_type(UICellType::DataVisualization).unwrap().position();
    let nav_pos = organism.find_cell_by_type(UICellType::Navigation).unwrap().position();
    
    let data_viz_distance = data_pos.distance_to(&viz_pos);
    let data_nav_distance = data_pos.distance_to(&nav_pos);
    
    assert!(data_viz_distance < data_nav_distance);
}

#[test]
fn test_organism_configuration() {
    let config = AliveConfig {
        max_population: 100,
        mutation_rate: 0.05,
        energy_decay_rate: 0.01,
        interaction_radius: 50.0,
        min_energy_threshold: 10.0,
        reproduction_energy_threshold: 80.0,
        spatial_damping: 0.9,
        learning_rate: 0.1,
    };
    
    let organism = UIOrganismField::with_config(config.clone());
    
    assert_eq!(organism.get_config().max_population, 100);
    assert_eq!(organism.get_config().mutation_rate, 0.05);
}

#[test]
fn test_organism_niches() {
    let mut organism = UIOrganismField::new();
    
    // Define UI niches
    organism.define_niche("header", 0.0, 0.0, 800.0, 100.0, UICellType::Header);
    organism.define_niche("sidebar", 0.0, 100.0, 200.0, 500.0, UICellType::Navigation);
    organism.define_niche("content", 200.0, 100.0, 600.0, 500.0, UICellType::Content);
    
    // Populate niches
    organism.populate_niches();
    
    // Each niche should have appropriate cell types
    let header_cells = organism.get_cells_in_region(0.0, 0.0, 800.0, 100.0);
    let sidebar_cells = organism.get_cells_in_region(0.0, 100.0, 200.0, 500.0);
    
    assert!(header_cells.iter().any(|c| matches!(c.cell_type(), UICellType::Header)));
    assert!(sidebar_cells.iter().any(|c| matches!(c.cell_type(), UICellType::Navigation)));
}

#[test]
fn test_organism_snapshot_and_restore() {
    let mut organism = UIOrganismField::new();
    
    // Populate with cells
    for i in 0..5 {
        organism.spawn_cell(UICellType::Generic, i as f64 * 50.0, i as f64 * 50.0);
    }
    
    // Take snapshot
    let snapshot = organism.create_snapshot();
    
    // Modify organism
    organism.evolve(1.0);
    organism.spawn_cell(UICellType::ButtonCore, 1000.0, 1000.0);
    
    let modified_population = organism.population();
    
    // Restore from snapshot
    organism.restore_from_snapshot(&snapshot);
    
    // Should be back to original state
    assert_eq!(organism.population(), 5);
    assert!(organism.population() != modified_population);
}

#[test]
fn test_organism_adaptive_layout() {
    let mut organism = UIOrganismField::new();
    
    // Add data streams that cells will organize around
    organism.add_data_stream("user_metrics", 100.0);
    organism.add_data_stream("sales_data", 200.0);
    organism.add_data_stream("system_health", 50.0);
    
    // Spawn cells randomly
    for _ in 0..15 {
        organism.spawn_random_cell();
    }
    
    // Let organism self-organize
    for _ in 0..200 {
        organism.adaptive_layout_step(0.016);
    }
    
    // Measure layout coherence
    let coherence_score = organism.evaluate_layout_coherence();
    assert!(coherence_score > 0.6);
    
    // Data display cells should be near their data streams
    let data_cells = organism.get_cells_by_type(UICellType::DataDisplay);
    for cell in data_cells {
        let nearest_stream_distance = organism.distance_to_nearest_data_stream(&cell);
        assert!(nearest_stream_distance < 100.0);
    }
}

#[test]
fn test_organism_performance_metrics() {
    let mut organism = UIOrganismField::new();
    
    // Populate standard UI
    organism.populate_standard_ui();
    
    // Run for a while and collect metrics
    for _ in 0..100 {
        organism.step(0.016);
        organism.collect_performance_metrics();
    }
    
    let metrics = organism.get_performance_summary();
    
    // Should have reasonable performance characteristics
    assert!(metrics.average_energy > 30.0);
    assert!(metrics.population_stability > 0.5);
    assert!(metrics.spatial_efficiency > 0.4);
    assert!(metrics.user_satisfaction > 0.3);
}