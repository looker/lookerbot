import ReplyContext from '../reply_context';

export default class Command {

  public attempt(context: ReplyContext): boolean {
    throw "implement"
  }

};
