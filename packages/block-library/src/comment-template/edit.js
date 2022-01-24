/**
 * WordPress dependencies
 */
import { useState } from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import {
	BlockContextProvider,
	BlockPreview,
	useBlockProps,
	useInnerBlocksProps,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { Spinner } from '@wordpress/components';
import { store as coreStore, useEntityProp } from '@wordpress/core-data';

/**
 * Internal dependencies
 */
import { useCommentQueryArgs, useCommentTree } from './hooks';

const TEMPLATE = [
	[ 'core/comment-author-avatar' ],
	[ 'core/comment-author-name' ],
	[ 'core/comment-date' ],
	[ 'core/comment-content' ],
	[ 'core/comment-reply-link' ],
	[ 'core/comment-edit-link' ],
];

/**
 * Component which renders the inner blocks of the Comment Template.
 *
 * @param {Object} props                    Component props.
 * @param {Array}  [props.comment]          - A comment object.
 * @param {Array}  [props.activeComment]    - The block that is currently active.
 * @param {Array}  [props.setActiveComment] - The setter for activeComment.
 * @param {Array}  [props.firstBlock]       - First comment in the array.
 * @param {Array}  [props.blocks]           - Array of blocks returned from
 *                                          getBlocks() in parent .
 * @return {WPElement}                 		Inner blocks of the Comment Template
 */
function CommentTemplateInnerBlocks( {
	comment,
	activeComment,
	setActiveComment,
	firstBlock,
	blocks,
} ) {
	const { children, ...innerBlocksProps } = useInnerBlocksProps(
		{},
		{ template: TEMPLATE }
	);
	return (
		<li { ...innerBlocksProps }>
			{ comment === ( activeComment || firstBlock ) ? (
				children
			) : (
				<BlockPreview
					blocks={ blocks }
					__experimentalLive
					__experimentalOnClick={ () => setActiveComment( comment ) }
				/>
			) }
			{ comment?.children?.length > 0 ? (
				<CommentsList
					comments={ comment.children }
					activeComment={ activeComment }
					setActiveComment={ setActiveComment }
					blocks={ blocks }
				/>
			) : null }
		</li>
	);
}

/**
 * Component that renders a list of (nested) comments. It is called recursively.
 *
 * @param {Object} props                    Component props.
 * @param {Array}  [props.comments]         - Array of comment objects.
 * @param {Array}  [props.blockProps]       - Props from parent's `useBlockProps()`.
 * @param {Array}  [props.activeComment]    - The block that is currently active.
 * @param {Array}  [props.setActiveComment] - The setter for activeComment.
 * @param {Array}  [props.blocks]           - Array of blocks returned from
 *                                          getBlocks() in parent .
 * @return {WPElement}                 		List of comments.
 */
const CommentsList = ( {
	comments,
	blockProps,
	activeComment,
	setActiveComment,
	blocks,
} ) => (
	<ol { ...blockProps }>
		{ comments &&
			comments.map( ( comment ) => (
				<BlockContextProvider
					key={ comment.commentId }
					value={ comment }
				>
					<CommentTemplateInnerBlocks
						comment={ comment }
						activeComment={ activeComment }
						setActiveComment={ setActiveComment }
						blocks={ blocks }
						firstBlock={ comments[ 0 ] }
					/>
				</BlockContextProvider>
			) ) }
	</ol>
);

export default function CommentTemplateEdit( { clientId, context } ) {
	const blockProps = useBlockProps();

	const [ activeComment, setActiveComment ] = useState();

	const queryArgs = useCommentQueryArgs( { context } );

	const { topLevelComments, blocks } = useSelect(
		( select ) => {
			const { getEntityRecords } = select( coreStore );
			const { getBlocks } = select( blockEditorStore );

			return {
				// Request only top-level comments. Replies are embedded.
				topLevelComments: queryArgs
					? getEntityRecords( 'root', 'comment', queryArgs )
					: null,
				blocks: getBlocks( clientId ),
			};
		},
		[ clientId, queryArgs ]
	);

	// Reverse the order of top comments if needed, as specified in the
	// Discussion settings.
	const [ commentOrder ] = useEntityProp( 'root', 'site', 'comment_order' );
	if ( commentOrder === 'desc' ) {
		topLevelComments?.reverse();
	}

	// Generate a tree structure of comment IDs.
	const { commentTree } = useCommentTree( topLevelComments );

	if ( ! topLevelComments ) {
		return (
			<p { ...blockProps }>
				<Spinner />
			</p>
		);
	}

	if ( ! commentTree.length ) {
		return <p { ...blockProps }> { __( 'No results found.' ) }</p>;
	}

	return (
		<CommentsList
			comments={ commentTree }
			blockProps={ blockProps }
			blocks={ blocks }
			activeComment={ activeComment }
			setActiveComment={ setActiveComment }
		/>
	);
}
