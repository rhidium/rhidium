import { type ComponentRegistry } from '@core/commands';
import TestChatInput, { TestJob } from './test';

const testRegistry = [TestChatInput, TestJob] as ComponentRegistry;

export default testRegistry;
