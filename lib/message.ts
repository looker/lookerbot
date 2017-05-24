export type FormattedMessage = string;

export type Message = FormattedMessage | IRichMessage;

export type SentMessage = IRichMessage & {
  channel: string;
  user: string;
  team: string;
  text: FormattedMessage;
};

export interface IRichMessage {
  text?: FormattedMessage;
  attachments?: IAttachment[];
};

export interface IAttachment {
  callback_id?: string;
  actions?: IAttachmentAction[];
  fields?: IAttachmentField[];
  text?: FormattedMessage
  fallback?: string,
  color?: string
  title?: string
  mrkdwn_in?: string[]
}

export interface IAttachmentField {
  title: FormattedMessage;
  value: FormattedMessage;
  fallback: string;
  short: boolean;
}

export interface IAttachmentAction {
  name: string,
  text: string,
  type: "button",
  value: string,
}
