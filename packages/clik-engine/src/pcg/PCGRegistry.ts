import { SeededRandom } from '../utils/random';
import { ConsoleReporter, ClikLogChannel } from '../debug/ConsoleReporter';
import type { LevelGenerator, LevelConstraint, PCGConfig, GeneratedLevel } from './PCGTypes';

const MAX_RETRIES = 3;

/**
 * Central registry for level generators and constraints.
 * Register named generators, then call `generate('dungeon', config)`.
 */
export class PCGRegistry {
  private generators = new Map<string, LevelGenerator>();
  private constraints = new Map<string, LevelConstraint>();

  registerGenerator(name: string, generator: LevelGenerator): void {
    this.generators.set(name, generator);
  }

  registerConstraint(name: string, constraint: LevelConstraint): void {
    this.constraints.set(name, constraint);
  }

  getGenerator(name: string): LevelGenerator | undefined {
    return this.generators.get(name);
  }

  getConstraint(name: string): LevelConstraint | undefined {
    return this.constraints.get(name);
  }

  listGenerators(): string[] {
    return Array.from(this.generators.keys());
  }

  listConstraints(): string[] {
    return Array.from(this.constraints.keys());
  }

  /**
   * Generate a level using a named generator, then validate against constraints.
   * Failed constraints with repair functions are auto-fixed (up to MAX_RETRIES).
   */
  generate(
    generatorName: string,
    config: PCGConfig,
    constraintNames?: string[],
  ): GeneratedLevel {
    const generator = this.generators.get(generatorName);
    if (!generator) {
      throw new Error(`Unknown generator: "${generatorName}". Available: ${this.listGenerators().join(', ')}`);
    }

    const seed = config.seed ?? Math.floor(Math.random() * 0x7fffffff);
    const difficulty = config.difficulty ?? 5;
    const fullConfig: PCGConfig = { ...config, seed, difficulty };

    const constraintsToCheck = constraintNames
      ? constraintNames.map(name => {
          const c = this.constraints.get(name);
          if (!c) throw new Error(`Unknown constraint: "${name}". Available: ${this.listConstraints().join(', ')}`);
          return c;
        })
      : [];

    let level: GeneratedLevel | undefined;
    let lastFailure = '';

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const random = new SeededRandom(seed + attempt);
      const start = performance.now();
      level = generator.generate(fullConfig, random);
      level.metadata.generationTimeMs = performance.now() - start;
      level.metadata.seed = seed + attempt;

      if (constraintsToCheck.length === 0) break;

      let allPassed = true;
      for (const constraint of constraintsToCheck) {
        const result = constraint.validate(level, fullConfig);
        if (!result.passed) {
          allPassed = false;
          lastFailure = `${constraint.name}: ${result.message}`;
          ConsoleReporter.log(ClikLogChannel.ENGINE, `PCG constraint failed: ${lastFailure} (attempt ${attempt + 1})`);
          if (constraint.repair && attempt < MAX_RETRIES) {
            level = constraint.repair(level, fullConfig);
            // Re-validate after repair
            const recheck = constraint.validate(level, fullConfig);
            if (recheck.passed) {
              allPassed = true;
              continue;
            }
          }
          break;
        }
      }

      if (allPassed) {
        ConsoleReporter.log(
          ClikLogChannel.ENGINE,
          `PCG generated "${generatorName}" level (${config.width}x${config.height}, difficulty=${difficulty}, seed=${level.metadata.seed}) in ${level.metadata.generationTimeMs.toFixed(1)}ms`,
        );
        return level;
      }
    }

    if (!level) {
      throw new Error(`Generator "${generatorName}" produced no output`);
    }

    ConsoleReporter.log(
      ClikLogChannel.ENGINE,
      `PCG returning level despite constraint failure after ${MAX_RETRIES} retries: ${lastFailure}`,
    );
    return level;
  }
}
