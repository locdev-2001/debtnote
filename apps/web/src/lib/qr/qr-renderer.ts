export interface QrPresentation {
  kind: 'embed';
  source: string;
}

export interface QrRenderer {
  render: (payload: string) => Promise<QrPresentation>;
}
