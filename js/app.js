// Composition root: concrete infrastructure is wired here, never inside a page.
import { authState } from './data/auth/authState.js';
import { BoardRepository } from './data/repositories/BoardRepository.js';
import { CohortRepository } from './data/repositories/CohortRepository.js';
import { AuthenticationService } from './data/auth/AuthenticationService.js';
import { AppLayoutManager } from './presentation/layout/AppLayout.js';
import { createRouter } from './presentation/navigation/BrowserRouter.js';

const services = { boards: BoardRepository, cohorts: CohortRepository, authentication: AuthenticationService };
const layout = new AppLayoutManager({ authState, ...services });
const router = createRouter({ authState, layout, services });
router.start();
window.addEventListener('online', () => { void BoardRepository.retryPreviews(); });
